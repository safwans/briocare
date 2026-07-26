"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BotFleet, type FleetPayload } from "@/lib/bot-fleet";

// DEV ONLY. AI-simulated patients, joined one avatar at a time.
//
// The therapist taps "Simulate via AI" on a teen's tile; that teen joins the real Daily room as a
// participant and from then on behaves like a patient — answering when spoken to, staying quiet
// when their persona would, and occasionally volunteering something. Nothing downstream is faked:
// the bots are real participants, so the batch pipeline generates real grounded notes from what
// they actually said.

type Line = { speaker: string; text: string };
type Mode = "idle" | "thinking" | "speaking";
type Asr = "unknown" | "on" | "off" | "error";

const END_OF_TURN_MS = 1200; // silence after the therapist stops that counts as "your turn"
const IDLE_CHATTER_MS = 25_000;
const GAP_BETWEEN_BOTS_MS = 400;
const ECHO_GUARD_MS = 500;

/** Loose token overlap — used to spot our own bots' audio coming back in via the therapist's mic. */
function looksLikeEcho(therapistText: string, botLines: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const said = norm(therapistText);
  if (said.length < 4) return false;
  return botLines.some((line) => {
    const bot = new Set(norm(line));
    if (bot.size === 0) return false;
    return said.filter((w) => bot.has(w)).length / said.length > 0.6;
  });
}

type SimApi = {
  active: string[];
  pending: string | null;
  speakingId: string | null;
  mode: Mode;
  asr: Asr;
  error: string | null;
  lines: Line[];
  riskRehearsal: boolean;
  setRiskRehearsal: (v: boolean) => void;
  toggle: (patientId: string) => void;
  stopAll: () => void;
};

const SimCtx = createContext<SimApi | null>(null);

export function useSim(): SimApi {
  const ctx = useContext(SimCtx);
  if (!ctx) throw new Error("useSim outside SimProvider");
  return ctx;
}

export function SimProvider({ sessionId, children }: { sessionId: string; children: React.ReactNode }) {
  const [active, setActive] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [asr, setAsr] = useState<Asr>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [riskRehearsal, setRiskRehearsal] = useState(false);

  const fleetRef = useRef<BotFleet | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const historyRef = useRef<Line[]>([]);
  const pendingSpeechRef = useRef("");
  const turnTimer = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const busyRef = useRef(false);
  const spokeAtRef = useRef(0);
  const recentBotLines = useRef<string[]>([]);
  const riskRef = useRef(riskRehearsal);
  const directorRef = useRef<(therapistSaid: string, arrivalPatientId?: string) => Promise<void>>(async () => {});

  useEffect(() => {
    riskRef.current = riskRehearsal;
  }, [riskRehearsal]);

  const push = useCallback((line: Line) => {
    historyRef.current = [...historyRef.current, line].slice(-24);
    setLines(historyRef.current.slice(-6));
  }, []);

  const armIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      void directorRef.current("");
    }, IDLE_CHATTER_MS);
  }, []);

  const runDirector = useCallback(
    async (therapistSaid: string, arrivalPatientId?: string) => {
      const fleet = fleetRef.current;
      if (!fleet || busyRef.current) return;
      const candidates = fleet.activeBots;
      if (candidates.length === 0) return;

      busyRef.current = true;
      setMode("thinking");
      try {
        const res = await fetch("/api/sim/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cohortName: fleet.payload.cohortName,
            module: fleet.payload.module,
            // meeting tokens deliberately not echoed back — the director has no use for them
            personas: candidates.map((b) => ({
              patientId: b.patientId,
              name: b.name,
              firstName: b.firstName,
              initials: b.initials,
              voice: b.voice,
              profile: b.profile,
              status: b.status,
              goals: b.goals,
            })),
            history: historyRef.current,
            therapistSaid,
            arrivalPatientId,
            riskRehearsal: riskRef.current,
          }),
        });
        const data = (await res.json()) as { turns?: { patientId: string; text: string }[]; error?: string };
        if (data.error) setError(data.error);

        for (const turn of data.turns ?? []) {
          if (!fleetRef.current?.isActive(turn.patientId)) continue;
          const who = candidates.find((b) => b.patientId === turn.patientId);
          setMode("speaking");
          setSpeakingId(turn.patientId);
          push({ speaker: who?.firstName ?? "Teen", text: turn.text });
          recentBotLines.current = [...recentBotLines.current, turn.text].slice(-4);
          await fleet.say(turn.patientId, turn.text);
          setSpeakingId(null);
          await new Promise((r) => setTimeout(r, GAP_BETWEEN_BOTS_MS));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "the director failed");
      } finally {
        spokeAtRef.current = Date.now();
        setSpeakingId(null);
        busyRef.current = false;
        if (fleetRef.current) setMode("idle");
        armIdle();
      }
    },
    [push, armIdle]
  );

  useEffect(() => {
    directorRef.current = runDirector;
  }, [runDirector]);

  const onTherapistSpeech = useCallback(
    (text: string) => {
      // Our own bots, coming out of the speakers and back in through the therapist's mic.
      if (looksLikeEcho(text, recentBotLines.current)) return;
      if (Date.now() - spokeAtRef.current < ECHO_GUARD_MS) return;

      // Barge-in: the therapist talked over the group. Cut the bots off and let them re-answer.
      if (fleetRef.current?.speaking) fleetRef.current.interrupt();

      pendingSpeechRef.current = `${pendingSpeechRef.current} ${text}`.trim();
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (turnTimer.current) window.clearTimeout(turnTimer.current);
      turnTimer.current = window.setTimeout(() => {
        const said = pendingSpeechRef.current.trim();
        pendingSpeechRef.current = "";
        if (!said) return;
        push({ speaker: "Facilitator", text: said });
        void runDirector(said);
      }, END_OF_TURN_MS);
    },
    [push, runDirector]
  );

  /** Lazily provision the room + personas + tokens, once per session. */
  const ensureFleet = useCallback(async (): Promise<BotFleet> => {
    if (fleetRef.current) return fleetRef.current;

    // Created inside the click handler — browsers only allow an unsuspended AudioContext from a
    // user gesture, and every bot's mic hangs off this one context.
    const audio = ctxRef.current ?? new AudioContext();
    await audio.resume();
    ctxRef.current = audio;

    const res = await fetch(`/api/sim/${sessionId}/bots`, { method: "POST" });
    const payload = (await res.json()) as FleetPayload & { error?: string };
    if (!res.ok || payload.error) throw new Error(payload.error ?? `couldn't provision bots (${res.status})`);

    const fleet = new BotFleet(payload, audio);
    fleet.listen(
      ({ text, isTherapist }) => {
        if (isTherapist) onTherapistSpeech(text);
      },
      (state) => setAsr(state)
    );
    fleetRef.current = fleet;
    return fleet;
  }, [sessionId, onTherapistSpeech]);

  const toggle = useCallback(
    (patientId: string) => {
      void (async () => {
        setError(null);
        setPending(patientId);
        try {
          const fleet = await ensureFleet();
          if (fleet.isActive(patientId)) {
            await fleet.remove(patientId);
          } else {
            await fleet.add(patientId);
            setActive(fleet.activeBots.map((b) => b.patientId));
            // A bot whose mic never published is in the room but silent — say so loudly rather
            // than letting it look like it's talking.
            const issue = fleet.micIssues.get(patientId);
            if (issue) setError(issue);
            // They've walked in — have them say something in character straight away, so the
            // therapist can see (and hear) that the seat is now occupied by a live patient.
            void directorRef.current("", patientId);
            armIdle();
          }
          setActive(fleetRef.current?.activeBots.map((b) => b.patientId) ?? []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "couldn't reach the room");
        } finally {
          setPending(null);
        }
      })();
    },
    [ensureFleet, armIdle]
  );

  const stopAll = useCallback(() => {
    void (async () => {
      if (turnTimer.current) window.clearTimeout(turnTimer.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      const fleet = fleetRef.current;
      fleetRef.current = null;
      setActive([]);
      setMode("idle");
      setAsr("unknown");
      setLines([]);
      historyRef.current = [];
      if (fleet) await fleet.destroy();
      await ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    })();
  }, []);

  // Never leave bots sitting in a Daily room burning participant-minutes.
  useEffect(() => {
    const bail = () => {
      void fleetRef.current?.destroy();
      fleetRef.current = null;
    };
    window.addEventListener("beforeunload", bail);
    window.addEventListener("pagehide", bail);
    return () => {
      window.removeEventListener("beforeunload", bail);
      window.removeEventListener("pagehide", bail);
      bail();
    };
  }, []);

  const api = useMemo<SimApi>(
    () => ({
      active, pending, speakingId, mode, asr, error, lines,
      riskRehearsal, setRiskRehearsal, toggle, stopAll,
    }),
    [active, pending, speakingId, mode, asr, error, lines, riskRehearsal, toggle, stopAll]
  );

  return <SimCtx.Provider value={api}>{children}</SimCtx.Provider>;
}

/** The control that sits on a teen's avatar tile. */
export function SimTileButton({ patientId, joined }: { patientId: string; joined: boolean }) {
  const { active, pending, speakingId, toggle } = useSim();
  const isSim = active.includes(patientId);
  const isPending = pending === patientId;

  // A real participant is in that seat — leave their tile alone.
  if (joined && !isSim) return null;

  if (isSim) {
    return (
      <button
        onClick={() => toggle(patientId)}
        title="Simulated by AI — click to remove"
        className="text-[10px] font-bold px-2 py-1 rounded-full"
        style={{
          background: speakingId === patientId ? "#ef7d5a" : "#12463a",
          color: "#ffffff",
          border: `1px solid ${speakingId === patientId ? "#ef7d5a" : "#2e7a5f"}`,
        }}
      >
        {speakingId === patientId ? "🤖 speaking…" : "🤖 AI patient"}
      </button>
    );
  }

  return (
    <button
      onClick={() => toggle(patientId)}
      disabled={isPending}
      className="text-[10px] font-semibold px-2 py-1 rounded-full disabled:opacity-70"
      style={{ background: "#1c7b8c", color: "#ffffff", border: "1px solid #2fa4b8" }}
    >
      {isPending ? "joining…" : "🤖 Simulate via AI"}
    </button>
  );
}
