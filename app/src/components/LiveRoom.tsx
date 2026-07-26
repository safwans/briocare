"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

export type RosterMember = { patientId: string; name: string; initials: string };

export type LiveRoomProps = {
  roomUrl: string;
  token: string;
  sessionId: string;
  asrMode?: "daily" | "deepgram";
  canTranscribe?: boolean;
  variant?: "facilitator" | "patient" | "group";
  // facilitator chrome
  roster?: RosterMember[];
  cohortName?: string;
  sessionIndex?: number;
  facilitatorName?: string;
  onLeaveHref?: string;
  /**
   * Optional overlay rendered on each roster tile. Used by the dev-only AI-patient simulator to
   * put a "Simulate via AI" control on the avatar. Undefined in production — no behavior change.
   */
  tileAction?: (member: RosterMember, joined: boolean) => React.ReactNode;
  /**
   * Server-rendered state so the room survives a tab switch. Everything below used to live only in
   * component state, so navigating away and back reset the transcript and every speaking timer to
   * zero even though the session was still running and the data was already persisted.
   */
  initialSpeaking?: Record<string, number>;
  initialTranscript?: { patientId: string; text: string }[];
  // patient group chrome
  myPatientId?: string;
  patientName?: string;
  groupLabel?: string;
  therapistInitials?: string;
};

// Live participant state, keyed by Daily session_id.
type Part = {
  sessionId: string;
  userId: string;
  userName: string;
  local: boolean;
  videoOn: boolean;
  audioOn: boolean;
  track: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
};

const BAR_COLORS = ["#2fa4b8", "#5ac0cd", "#e8875a", "#d9a441", "#7fb87f", "#c98bb0", "#8f9fd0", "#63b3a4"];

// Speaking time as a clock, e.g. 48s -> "0:48", 83s -> "1:23".
function fmtTalk(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Attaches a MediaStreamTrack to a <video> element.
function Video({ track, muted, className }: { track: MediaStreamTrack; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    void el.play().catch(() => {});
    return () => { if (el) el.srcObject = null; };
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
}

// Plays a remote audio track (call-object mode does not auto-play remote audio).
function Audio({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    void el.play().catch(() => {});
    return () => { if (el) el.srcObject = null; };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}

export default function LiveRoom({
  roomUrl, token, sessionId,
  asrMode = "deepgram", canTranscribe = false,
  variant = "patient", roster = [], cohortName = "", sessionIndex, facilitatorName = "Facilitator",
  onLeaveHref, tileAction, initialSpeaking, initialTranscript,
  myPatientId, patientName = "you", groupLabel = "Group", therapistInitials = "DC",
}: LiveRoomProps) {
  const callRef = useRef<DailyCall | null>(null);
  const [parts, setParts] = useState<Record<string, Part>>({});
  const [speaking, setSpeaking] = useState<Record<string, number>>(initialSpeaking ?? {}); // userId -> ms
  // Live transcript, seeded from what's already persisted for this session.
  const [transcript, setTranscript] = useState<{ patientId: string; text: string }[]>(initialTranscript ?? []);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null); // session_id
  const [elapsed, setElapsed] = useState(0);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(variant === "facilitator");
  const [camOn, setCamOn] = useState(variant === "facilitator");
  // Why this exists: without it, every way the camera can fail to produce a track — permission
  // denied, device already in use, no device at all — renders identically as "Camera starting…"
  // and never resolves. On a freshly deployed origin the browser re-prompts for permission, so
  // this is the first thing a clinician hits.
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [cheered, setCheered] = useState(false);

  // Seeded so the per-member timers continue from what's already on the server rather than
  // restarting at 0:00 every time the clinician navigates back into the room.
  const speakingRef = useRef<Record<string, number>>({ ...(initialSpeaking ?? {}) });
  const activeRef = useRef<string | null>(null);

  const refresh = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const raw = call.participants() as any;
    const next: Record<string, Part> = {};
    for (const key of Object.keys(raw)) {
      const p = raw[key];
      const vid = p?.tracks?.video;
      const aud = p?.tracks?.audio;
      const videoOn = vid?.state === "playable";
      const audioOn = aud?.state === "playable";
      next[p.session_id] = {
        sessionId: p.session_id,
        userId: p.user_id || (p.local ? "local" : p.session_id),
        userName: p.user_name || "",
        local: !!p.local,
        videoOn,
        audioOn,
        track: videoOn ? (vid?.persistentTrack ?? vid?.track ?? null) : null,
        audioTrack: audioOn ? (aud?.persistentTrack ?? aud?.track ?? null) : null,
      };
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    setParts(next);
  }, []);

  useEffect(() => {
    let disposed = false;
    let flushAll: (() => void) | undefined;
    let evInterval: number | undefined;
    let tick: number | undefined;

    const setup = async () => {
      const stale = DailyIframe.getCallInstance();
      if (stale) await stale.destroy().catch(() => {});
      if (disposed) return;
      if (DailyIframe.getCallInstance()) return;

      const call = DailyIframe.createCallObject({ subscribeToTracksAutomatically: true });
      callRef.current = call;

      const t0 = Date.now();
      const evBuf: { patientId: string; type: string; atMs: number }[] = [];
      const txBuf: { patientId: string; text: string; startMs: number; endMs: number }[] = [];
      const rec = (uid: string | undefined, type: string) => { if (uid) evBuf.push({ patientId: uid, type, atMs: Date.now() - t0 }); };

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const onChange = () => refresh();
      call.on("joined-meeting", () => { setJoined(true); refresh(); });
      call.on("participant-joined", (e: any) => { rec(e?.participant?.user_id, "JOIN"); refresh(); });
      call.on("participant-updated", onChange);
      call.on("participant-left", (e: any) => { rec(e?.participant?.user_id, "LEAVE"); refresh(); });
      call.on("track-started", (e: any) => {
        if (e?.track?.kind === "video") rec(e?.participant?.user_id, "CAMERA_ON");
        // Our own devices came up after a failure (e.g. the clinician granted permission and
        // retried) — drop the warning rather than leaving it stale on screen.
        if (e?.participant?.local) setDeviceError(null);
        refresh();
      });
      call.on("track-stopped", (e: any) => { if (e?.track?.kind === "video") rec(e?.participant?.user_id, "CAMERA_OFF"); refresh(); });
      call.on("app-message", (e: any) => {
        // Daily delivers live transcription over app-message with fromId "transcription", not a
        // participant id. Recording those as CHAT invents a patient that doesn't exist and inflates
        // chat counts — recomputeEngagement() groups by patientId, so it even mints an
        // EngagementMetric row for it. Only real participants count as chat.
        if (!e?.fromId || e.fromId === "transcription") return;
        rec(e.fromId, "CHAT");
      });
      call.on("camera-error", (e: any) => {
        // Daily reports the blocked/failed device here. `type` is the useful part
        // ("permissions", "not-found", "in-use"); errorMsg carries the browser's own wording.
        const type = e?.error?.type as string | undefined;
        const detail = e?.errorMsg?.errorMsg || e?.error?.localizedMsg;
        setDeviceError(
          type === "permissions"
            ? "Camera and mic are blocked for this site. Allow them in your browser's address-bar permissions, then rejoin."
            : type === "not-found"
            ? "No camera or microphone was found on this device."
            : type === "in-use"
            ? "Your camera or mic is already in use by another app. Close it, then rejoin."
            : // Unrecognised type: still give an action rather than echoing Daily's raw wording
              // ("Unknown device error (NotSupportedError)"), which tells a clinician nothing.
              `Camera and mic could not start — check this site's permissions and that no other app is using them.${detail ? ` (${detail})` : ""}`
        );
      });
      call.on("active-speaker-change", (e: any) => {
        const peer = e?.activeSpeaker?.peerId ?? null;
        activeRef.current = peer;
        setActiveSpeaker(peer);
      });
      // EVERY client captures, not just the facilitator. Daily broadcasts transcription-message to
      // all participants, so making the clinician's tab the only recorder made it a single point of
      // failure: if they reloaded or closed it mid-session, capture stopped for the whole room and
      // nothing recovered the gap. With every client posting, the ingest route de-duplicates
      // (see api/session/[sessionId]/transcript) and any one client surviving is enough.
      //
      // Timestamps come from Daily's server-assigned `timestamp`, NOT `Date.now() - t0`: t0 is each
      // client's own join time, so a relative clock differs per capturer and the same utterance
      // would never dedupe. It also means a clinician who joins late no longer skews the timeline.
      if (asrMode === "daily") {
        call.on("transcription-message", (e: any) => {
          // participants() keys the local participant under "local", not their session_id, so a
          // plain lookup resolves everyone EXCEPT yourself — which silently made each client unable
          // to capture its own speech. Fall back to the local record when the id matches.
          const parts = (call.participants() as any) ?? {};
          const speaker = parts[e?.participantId] ?? (parts.local?.session_id === e?.participantId ? parts.local : undefined);
          const uid = speaker?.user_id as string | undefined;
          if (!uid || !e?.text) return;
          const at = e?.timestamp ? new Date(e.timestamp).getTime() : Date.now();
          txBuf.push({ patientId: uid, text: e.text, startMs: at, endMs: at });
          // Also surface it on screen. Capture and display were separate concerns before: the
          // transcript was persisted correctly but nothing ever rendered it, which is why it
          // looked like transcription only worked during AI simulation (which has its own panel).
          setTranscript((prev) => [...prev.slice(-199), { patientId: uid, text: e.text }]);
        });
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */

      const post = (url: string, payload: string) => {
        if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
        else void fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      };
      flushAll = () => {
        if (evBuf.length) post(`/api/session/${sessionId}/events`, JSON.stringify({ events: evBuf.splice(0) }));
        if (txBuf.length) post(`/api/session/${sessionId}/transcript`, JSON.stringify({ segments: txBuf.splice(0) }));
      };
      evInterval = window.setInterval(flushAll, 5000);

      // 1s tick: timer + accrue speaking time to the current active speaker.
      tick = window.setInterval(() => {
        setElapsed((s) => s + 1);
        const active = activeRef.current;
        if (active) {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const uid = (call.participants() as any)?.[active]?.user_id as string | undefined;
          if (uid) {
            speakingRef.current[uid] = (speakingRef.current[uid] ?? 0) + 1000;
            setSpeaking({ ...speakingRef.current });
          }
        }
      }, 1000);

      const joinErr = await call
        .join({
          url: roomUrl, token,
          startVideoOff: variant !== "facilitator",
          startAudioOff: variant !== "facilitator",
        })
        .then(() => null)
        .catch((e: unknown) => (e instanceof Error ? e.message : "could not join the room"));
      if (disposed) return;
      if (joinErr) setDeviceError(joinErr);

      // The room is created with start_video_off / start_audio_off true so teens arrive muted
      // until they're ready (docs/cpaas-integration.md §3). daily-js forwards the join-time
      // overrides to the server-side call machine rather than acting on them locally, so the
      // facilitator — who should arrive live — otherwise comes up with no camera or mic despite
      // startVideoOff:false above, and the tile sits on "Camera starting…" forever. Re-assert
      // explicitly once we're actually in. Same fix bot-fleet.ts needs for its synthetic mic.
      if (variant === "facilitator" && !joinErr) {
        call.setLocalVideo(true);
        call.setLocalAudio(true);
      }
      refresh();
      if (asrMode === "daily" && canTranscribe) { try { call.startTranscription(); } catch {} }
    };

    void setup();

    return () => {
      disposed = true;
      if (evInterval) window.clearInterval(evInterval);
      if (tick) window.clearInterval(tick);
      flushAll?.();
      const call = callRef.current;
      // Deliberately NOT stopping transcription here. Unmount fires on any navigation or reload,
      // and stopping is room-wide — one clinician refresh used to kill capture for every
      // participant. Daily ends transcription when the room empties or expires, which is the
      // correct lifetime for it.
      call?.destroy().catch(() => {});
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    const call = callRef.current; if (!call) return;
    const next = !micOn; setMicOn(next); call.setLocalAudio(next);
  };
  const toggleCam = () => {
    const call = callRef.current; if (!call) return;
    const next = !camOn; setCamOn(next); call.setLocalVideo(next);
  };
  const leave = () => {
    setLeft(true);
    callRef.current?.leave().catch(() => {});
    if (onLeaveHref) window.location.href = onLeaveHref;
  };

  const byUser: Record<string, Part> = {};
  let localPart: Part | undefined;
  for (const p of Object.values(parts)) {
    if (p.local) localPart = p;
    else byUser[p.userId] = p;
  }
  const activeUserId = activeSpeaker ? parts[activeSpeaker]?.userId : undefined;
  // Is our microphone genuinely publishing, and are we the one being heard right now?
  const micLive = !!localPart?.audioOn;
  const speakingNow = !!localPart && activeSpeaker === localPart.sessionId;
  // "Mic on" was driven purely by `micOn` — React state seeded to true for facilitators and only
  // ever changed by the button. So the control read green whenever nobody had clicked mute, even
  // when the browser never acquired the device (blocked permission, or another tab already
  // holding it — the common case when you open the therapist and patient views side by side).
  // The button now reports the PUBLISHED track, so green means the room can actually hear you.
  const micStalled = joined && micOn && !micLive;
  const micLabel = !micOn ? "🔇 Mic off" : micStalled ? "⚠️ Mic not live" : "🎤 Mic on";
  const micBg = !micOn ? "#5a2530" : micStalled ? "#6b4a18" : "#1e4a56";
  const micHint = micStalled
    ? "Your mic isn't reaching the room. Another tab or app is probably holding it — close it, then toggle the mic off and on."
    : null;

  // Remote audio must be attached to <audio> elements ourselves in call-object mode.
  const remoteAudio = Object.values(parts)
    .filter((p) => !p.local && p.audioOn && p.audioTrack)
    .map((p) => <Audio key={p.sessionId} track={p.audioTrack!} />);

  if (left) {
    return <div className="w-full h-full grid place-items-center text-[#9fb6bb] bg-[#0e2029]">You&apos;ve left the room.</div>;
  }

  // ---------- FACILITATOR VIEW (matches the mock) ----------
  if (variant === "facilitator") {
    const bars = roster.map((m, i) => ({
      name: m.name,
      ms: speaking[m.patientId] ?? 0,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));
    const maxMs = Math.max(1, ...bars.map((b) => b.ms));
    const facInitials =
      facilitatorName.split(" ").filter((w) => w && !w.endsWith(".")).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "YOU";

    return (
      <div className="flex flex-col h-full" style={{ background: "#0e2029" }}>
        {remoteAudio}
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-4 border-b" style={{ borderColor: "#1e3a44", color: "#cfe0e2" }}>
          <div className="flex items-center gap-4 min-w-0">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white shrink-0">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#b8556a" }} />
              Live{sessionIndex != null ? ` · Session ${sessionIndex}` : ""}
            </span>
            <span className="text-sm truncate" style={{ color: "#7f9aa1" }}>{cohortName} · facilitated by {facilitatorName}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3 py-1.5 rounded-full"
              style={joined
                ? { color: "#bfe9d5", background: "#12463a", border: "1px solid #2e7a5f" }
                : { color: "#e8c58a", background: "#3a2f18", border: "1px solid #7a5f2e" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: joined ? "#4bbf93" : "#e8a44b" }} />
              {joined ? "You're in the room" : "Connecting…"}
            </span>
            <span className="text-sm tabular-nums" style={{ color: "#cfe0e2", fontFamily: "var(--font-display, inherit)" }}>{fmtClock(elapsed)}</span>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white px-3 py-1.5 rounded-full" style={{ background: "#c1445b" }}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />REC
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full" style={{ color: "#cdeede", background: "#12303a", border: "1px solid #2e7a5f" }}>
              🔒 Two-party consent on file
            </span>
            <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold px-3 py-1.5 rounded-full" style={{ color: "#8fd0da", background: "#12303a", border: "1px solid #1e4a56" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2fa4b8" }} />AI silent
            </span>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main column: participant grid + capture/consent band below it */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tile grid */}
          <div className="flex-1 grid gap-2.5 p-4 overflow-y-auto content-start" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "minmax(150px, 1fr)" }}>
            {roster.map((m) => {
              const p = byUser[m.patientId];
              const joinedMember = !!p;
              const isActive = activeUserId === m.patientId;
              const camOff = !p?.videoOn;
              return (
                <div key={m.patientId} className="relative rounded-xl overflow-hidden flex items-end p-3" style={{ minHeight: 150, background: "#132e37", border: `2px solid ${isActive ? "#3fd0dc" : "#21454f"}`, opacity: joinedMember ? 1 : tileAction ? 0.85 : 0.55 }}>
                  {p?.videoOn && p.track ? (
                    <div className="absolute inset-0"><Video track={p.track} muted /></div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[52px] h-[52px] rounded-full grid place-items-center font-bold" style={{ background: "#2a4a54", color: "#cfe0e2" }}>{m.initials}</div>
                    </div>
                  )}
                  {tileAction && (
                    <div className="absolute inset-x-0 flex justify-center z-20" style={{ top: "58%" }}>
                      {tileAction(m, joinedMember)}
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    {joinedMember && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: "#c1445b" }}>
                        <span className="w-1 h-1 rounded-full bg-white" />REC
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: "#bfe9d5", background: "#12463a", border: "1px solid #2e7a5f" }}>consent ✓</span>
                  </div>
                  <div className="relative flex items-center gap-2 z-10">
                    <span className="w-2 h-2 rounded-full" style={{ background: joinedMember ? (p?.audioOn ? "#4bbf93" : "#7f9aa1") : "#405a63" }} />
                    <span className="text-[13px] font-semibold text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{m.name}</span>
                    {joinedMember && camOff && <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: "#cfe0e2", background: "#00000055" }}>cam off</span>}
                    {!joinedMember && <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: "#8aa2a8", background: "#00000040" }}>not joined</span>}
                  </div>
                </div>
              );
            })}
            {/* Facilitator self tile (dashed) */}
            <div className="relative rounded-xl overflow-hidden flex items-end p-3" style={{ minHeight: 150, border: "2px dashed #3fd0dc", background: "#0d2731" }}>
              {localPart?.videoOn && localPart.track ? (
                <div className="absolute inset-0"><Video track={localPart.track} muted /></div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-[52px] h-[52px] rounded-full grid place-items-center font-bold" style={{ background: "#2a4a54", color: "#cfe0e2" }}>{facInitials}</div>
                  <div className="text-[11px]" style={{ color: deviceError ? "#e59a86" : "#7f9aa1" }}>
                    {!joined ? "Connecting…" : deviceError ? "Camera blocked" : camOn ? "Camera starting…" : "Camera off"}
                  </div>
                </div>
              )}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: "#06222b", background: "#3fd0dc" }}>You</span>
              </div>
              {/* Mic state from the ACTUAL track, not the button. `micOn` is React state — it says
                  what you asked for, not whether audio is publishing, so a silently dead mic looked
                  identical to a working one. localPart.audioOn is Daily's track state === playable;
                  activeUserId is the room's active speaker, which is what makes the dot pulse when
                  you're actually being heard. */}
              <div className="relative flex items-center gap-2 z-10">
                <span
                  className={`w-2 h-2 rounded-full ${micLive && speakingNow ? "animate-pulse" : ""}`}
                  style={{ background: !micOn ? "#b8556a" : micLive ? "#4bbf93" : "#e8a44b" }}
                  title={!micOn ? "Mic off" : micLive ? (speakingNow ? "Speaking" : "Mic live") : "Mic not publishing"}
                />
                <span className="text-[13px] font-semibold" style={{ color: "#cfe0e2", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{facilitatorName} (you)</span>
                {joined && micOn && !micLive && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: "#3a2f18", background: "#e8a44b" }}>mic not live</span>
                )}
              </div>
            </div>
          </div>

          </div>

          {/* Telemetry sidebar — leads with speaking time (per-member status) */}
          <aside className="w-[300px] shrink-0 flex flex-col overflow-hidden p-5" style={{ background: "#12303a", borderLeft: "1px solid #1e3a44", color: "#cfe0e2" }}>
            <div className="text-[12px] font-semibold uppercase tracking-wider mb-3 shrink-0" style={{ color: "#6a8b93" }}>Speaking time · this session</div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 -mr-2 pr-2">
              {bars.map((b) => (
                <div key={b.name}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: "#dbe9eb" }}>{b.name}</span>
                    <span className="tabular-nums" style={{ color: "#7f9aa1" }}>{fmtTalk(b.ms)}</span>
                  </div>
                  <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "#1e4a56" }}>
                    <div style={{ width: `${(b.ms / maxMs) * 100}%`, height: "100%", background: b.color, transition: "width 0.5s" }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Live transcript. The words were always being captured and persisted — there was
                simply nothing rendering them, so the only place a clinician ever saw a transcript
                was the dev-only AI-simulator panel. Seeded from the server so it survives leaving
                and re-entering the room mid-session. */}
            <div className="mt-4 shrink-0 flex flex-col" style={{ maxHeight: "38%" }}>
              <div className="text-[12px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: "#6a8b93" }}>
                Transcript
                {asrMode !== "daily" && (
                  <span className="text-[10px] font-medium normal-case px-1.5 py-0.5 rounded" style={{ color: "#e8c58a", background: "#3a2f18" }}>batch mode</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 -mr-2 pr-2 text-[12.5px] leading-relaxed">
                {transcript.length === 0 ? (
                  <div style={{ color: "#5f8089" }}>Nothing yet — lines appear as people speak.</div>
                ) : (
                  transcript.slice(-40).map((line, i) => {
                    const who = line.patientId.startsWith("clinician-")
                      ? facilitatorName
                      : roster.find((m) => m.patientId === line.patientId)?.name ?? "Member";
                    return (
                      <div key={`${i}-${line.text.slice(0, 12)}`}>
                        <span className="font-semibold" style={{ color: "#8fd0da" }}>{who}: </span>
                        <span style={{ color: "#cfe0e2" }}>{line.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="rounded-[10px] p-3.5 mt-4 shrink-0" style={{ background: "#16394480", border: "1px solid #1e4a56" }}>
              <div className="text-[13px] font-semibold text-white mb-1">Captured for review</div>
              <div className="text-[12px] leading-relaxed" style={{ color: "#9db8bd" }}>Streams post to Note review the moment you end the session.</div>
            </div>
          </aside>
        </div>

        {/* Control bar */}
        <div className="flex items-center justify-between px-7 py-3" style={{ background: "#0b1a20", borderTop: "1px solid #1e3a44" }}>
          <div className="text-[12px]" style={{ color: deviceError || micHint ? "#e59a86" : "#7f9aa1" }}>
            {/* Mic first: a blocked mic is what stops the room hearing you, and the camera error
                that usually accompanies it is the less useful half of the message. */}
            {micHint
              ? micHint
              : deviceError
              ? deviceError
              : joined
              ? "You're connected — members join from their own app."
              : "Connecting you to the room…"}
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={toggleMic} title={micHint ?? undefined} className="rounded-full px-4 py-2 text-[13px] font-semibold" style={{ background: micBg, color: "#fff" }}>{micLabel}</button>
            <button onClick={toggleCam} className="rounded-full px-4 py-2 text-[13px] font-semibold" style={{ background: camOn ? "#1e4a56" : "#5a2530", color: "#fff" }}>{camOn ? "📷 Camera on" : "🚫 Camera off"}</button>
            <button onClick={leave} className="rounded-full px-5 py-2 text-[13px] font-bold text-white" style={{ background: "#c1445b" }}>Leave room</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PATIENT GROUP VIEW (turn-taking; matches the mock) ----------
  if (variant === "group") {
    // Presentational sharing round derived from the roster. The turn orchestration
    // (foreground co-pilot) is a front-end preview; video/presence/speaking are real.
    const meIdx = Math.max(0, roster.findIndex((m) => m.patientId === myPatientId));
    const queue = roster.map((m, i) => {
      const isMe = m.patientId === myPatientId;
      let tag = "waiting";
      if (i < meIdx) tag = "shared";
      else if (isMe) tag = "your turn";
      else if (i === meIdx + 1) tag = "up next";
      return { ...m, isMe, tag };
    });
    const roundDone = meIdx;

    // The facilitator (joins as `clinician-<id>`) — shown large and prominent for patients.
    const facPart = Object.values(parts).find((p) => !p.local && p.userId.startsWith("clinician-"));
    const facSpeaking = facPart ? activeSpeaker === facPart.sessionId : false;

    return (
      <div className="min-h-[78vh]" style={{ background: "#0e2029", color: "#eaf6f7" }}>
        {remoteAudio}
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#d98c6f" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#ef7d5a" }} />You&apos;re in group
              </div>
              <div className="text-xl font-bold tracking-tight" style={{ color: "#eaf6f7" }}>{groupLabel}</div>
            </div>
            <div className="text-[13px] tabular-nums" style={{ color: "#8fb4bb" }}>{fmtClock(elapsed)}</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* Participant column: facilitator (prominent) + peer grid + controls */}
            <div className="self-start">
            {/* Facilitator — largest, most visible tile */}
            <div className="relative rounded-2xl overflow-hidden flex items-end p-4 mb-3" style={{ minHeight: 260, background: "#0d2e35", border: `3px solid ${facSpeaking ? "#7fd0dc" : "#2fa4b8"}` }}>
              {facPart?.videoOn && facPart.track ? (
                <div className="absolute inset-0"><Video track={facPart.track} /></div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-20 h-20 rounded-full grid place-items-center font-bold text-2xl" style={{ background: "linear-gradient(150deg,#4fc0d1,#2fa4b8)", color: "#06222b" }}>{therapistInitials}</div>
                  {!facPart && <div className="text-[12px]" style={{ color: "#7fa7ae" }}>Your therapist will appear here</div>}
                </div>
              )}
              <span className="absolute top-3 left-3 z-10 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "#2fa4b8", color: "#06222b" }}>
                {facilitatorName} · facilitator
              </span>
              {facSpeaking && (
                <span className="absolute top-3 right-3 z-10 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#ef7d5a", color: "#fff" }}>speaking</span>
              )}
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#6a8b93" }}>Your group</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {roster.map((m) => {
                const isMe = m.patientId === myPatientId;
                const p = isMe ? localPart : byUser[m.patientId];
                const speakingNow = isMe ? activeSpeaker === localPart?.sessionId : activeUserId === m.patientId;
                return (
                  <div key={m.patientId} className="relative rounded-2xl overflow-hidden flex items-end p-3" style={{ minHeight: 158, background: "#132e37", border: `2px solid ${isMe ? "#ef7d5a" : speakingNow ? "#3fd0dc" : "#20454f"}` }}>
                    {p?.videoOn && p.track ? (
                      <div className="absolute inset-0"><Video track={p.track} muted={isMe} /></div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full grid place-items-center font-bold" style={{ background: isMe ? "#ef7d5a" : "#cfeef2", color: isMe ? "#fff" : "#0f333b" }}>{m.initials[0]}</div>
                      </div>
                    )}
                    {speakingNow && (
                      <span className="absolute top-2.5 right-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-full z-10" style={{ background: "#ef7d5a", color: "#fff" }}>speaking</span>
                    )}
                    <div className="relative flex items-center gap-2 z-10">
                      <span className="w-2 h-2 rounded-full" style={{ background: p?.audioOn ? "#4bbf93" : "#7f9aa1" }} />
                      <span className="text-[13.5px] font-semibold" style={{ color: "#eaf6f7", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{isMe ? "You" : m.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Control bar — directly below the grid, easy to reach */}
            <div className="flex flex-wrap justify-center items-center gap-2.5 mt-4">
              <button onClick={toggleMic} title={micHint ?? undefined} className="rounded-full px-5 py-2.5 text-[14px] font-semibold" style={{ background: micBg, color: "#fff" }}>{!micOn ? "🔇 Unmute" : micStalled ? "⚠️ Mic not live" : "🎤 Mute"}</button>
              <button onClick={toggleCam} className="rounded-full px-5 py-2.5 text-[14px] font-semibold" style={{ background: camOn ? "#1e4a56" : "#5a2530", color: "#fff" }}>{camOn ? "📷 Camera on" : "🚫 Camera off"}</button>
              <button onClick={() => setHandRaised((h) => !h)} className="rounded-full px-5 py-2.5 text-[14px] font-semibold" style={{ background: handRaised ? "#ef7d5a" : "#123339", border: "1px solid #22484f", color: handRaised ? "#fff" : "#cfe9ee" }}>{handRaised ? "✋ Hand raised" : "✋ Raise hand"}</button>
              <button onClick={() => setCheered(true)} className="rounded-full px-5 py-2.5 text-[14px] font-semibold" style={{ background: "#123339", border: "1px solid #22484f", color: "#cfe9ee" }}>{cheered ? "💛 Sent" : "💛 Cheer a friend"}</button>
              <button onClick={leave} className="rounded-full px-5 py-2.5 text-[14px] font-bold text-white" style={{ background: "#c1445b" }}>Leave</button>
            </div>
            </div>

            {/* Turn-taking sidebar */}
            <aside className="flex flex-col gap-3.5">
              {/* Facilitator card */}
              <div className="rounded-[22px] p-5 text-center relative overflow-hidden" style={{ background: "linear-gradient(160deg,#1b4d58,#0f333b)" }}>
                <div className="w-[62px] h-[62px] rounded-full mx-auto mb-3 grid place-items-center font-bold text-xl" style={{ background: "linear-gradient(150deg,#4fc0d1,#2fa4b8)", color: "#06222b" }}>{therapistInitials}</div>
                <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7fd0dc" }}>{facilitatorName.replace(/^Dr\.?\s*/, "Dr. ").split(" ").slice(0, 2).join(" ")} · facilitator</div>
                <p className="text-[15px] leading-relaxed font-medium" style={{ color: "#eaf6f7" }}>
                  &ldquo;Thanks, Devon. {patientName}, I&apos;d love to hear from you — what&apos;s one thing that went okay this week?&rdquo;
                </p>
                <div className="inline-flex items-center gap-2 mt-3.5 rounded-full px-3 py-1.5" style={{ background: "#0f333b", border: "1px solid #21545e" }}>
                  <span className="w-3 h-3 rounded-full" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)" }} />
                  <span className="text-[11.5px] font-semibold" style={{ color: "#9fd3db" }}>Brio co-pilot keeps turns fair — so everyone&apos;s heard</span>
                </div>
              </div>

              {/* Your turn */}
              <div className="rounded-[20px] p-4 flex items-center gap-3.5" style={{ background: "#fff6ef", border: "1.5px solid #f6c9ab" }}>
                <div className="w-12 h-12 rounded-full grid place-items-center shrink-0" style={{ background: "#ef7d5a" }}>
                  <span className="w-3.5 h-5 rounded-lg bg-white" />
                </div>
                <div>
                  <div className="text-[17px] font-bold" style={{ color: "#b8552f" }}>It&apos;s your turn</div>
                  <div className="text-[13.5px]" style={{ color: "#a9714f" }}>Take your time. Pass if you&apos;d rather.</div>
                </div>
              </div>

              {/* Turn order */}
              <div className="rounded-[18px] p-4" style={{ background: "#123339", border: "1px solid #22484f" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#7fa7ae" }}>Turn order</span>
                  <span className="text-[12px]" style={{ color: "#7fa7ae" }}>{roundDone} of {roster.length} shared</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {queue.map((q) => {
                    const tagColor = q.tag === "shared" ? "#6f959c" : q.tag === "your turn" ? "#ef7d5a" : q.tag === "up next" ? "#7fd0dc" : "#6f959c";
                    return (
                      <div key={q.patientId} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: q.isMe ? "#0f2a30" : "transparent" }}>
                        <span className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0" style={{ background: q.isMe ? "#ef7d5a" : "#20454f", color: q.isMe ? "#fff" : "#cfe9ee" }}>{q.initials[0]}</span>
                        <span className="text-[14.5px]" style={{ color: q.tag === "waiting" ? "#7fa7ae" : "#eaf6f7", fontWeight: q.isMe ? 700 : 500 }}>{q.isMe ? "You" : q.name}</span>
                        <span className="ml-auto text-[12px]" style={{ color: tagColor, fontWeight: q.tag === "your turn" ? 700 : 500 }}>{q.tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </aside>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PATIENT VIEW ----------
  const remote = Object.values(parts).filter((p) => !p.local);
  const tiles = [...remote, ...(localPart ? [localPart] : [])];
  return (
    <div className="flex flex-col h-full" style={{ background: "#0e2029" }}>
      {remoteAudio}
      <div className="flex-1 grid gap-2.5 p-3 overflow-y-auto content-start" style={{ gridTemplateColumns: tiles.length <= 1 ? "1fr" : "repeat(2, 1fr)", gridAutoRows: "minmax(160px, 1fr)" }}>
        {tiles.length === 0 && (
          <div className="grid place-items-center text-[#9fb6bb]" style={{ minHeight: 200 }}>{joined ? "Waiting for others to join…" : "Joining…"}</div>
        )}
        {tiles.map((p) => {
          const isActive = activeSpeaker === p.sessionId;
          return (
            <div key={p.sessionId} className="relative rounded-xl overflow-hidden flex items-end p-3" style={{ minHeight: 160, background: "#132e37", border: `2px solid ${isActive ? "#3fd0dc" : "#21454f"}` }}>
              {p.videoOn && p.track ? (
                <div className="absolute inset-0"><Video track={p.track} muted={p.local} /></div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full grid place-items-center font-bold text-xl" style={{ background: "#2a4a54", color: "#cfe0e2" }}>
                    {(p.userName || "?").slice(0, 1).toUpperCase()}
                  </div>
                </div>
              )}
              <div className="relative flex items-center gap-2 z-10">
                <span className="w-2 h-2 rounded-full" style={{ background: p.audioOn ? "#4bbf93" : "#7f9aa1" }} />
                <span className="text-[13px] font-semibold text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{p.local ? "You" : p.userName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient controls */}
      <div className="flex items-center justify-center gap-3 py-4" style={{ background: "#0b1a20", borderTop: "1px solid #1e3a44" }}>
        <button onClick={toggleMic} title={micHint ?? undefined} className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: micBg, color: "#fff" }}>{!micOn ? "Unmute" : micStalled ? "Mic not live" : "Mute"}</button>
        <button onClick={toggleCam} className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: camOn ? "#1e4a56" : "#5a2530", color: "#fff" }}>{camOn ? "Camera on" : "Camera off"}</button>
        <button onClick={leave} className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#c1445b" }}>Leave</button>
      </div>
    </div>
  );
}
