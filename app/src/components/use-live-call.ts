"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

// The live Daily call, extracted from LiveRoom so it can outlive the page that started it.
// A facilitator who clicks through to a cohort mid-session must stay in the room — patients are
// watching them — so ownership of the call sits above the route (see LiveSession.tsx), while the
// patient and group views still run it locally.

export type Part = {
  sessionId: string;
  userId: string;
  userName: string;
  local: boolean;
  videoOn: boolean;
  audioOn: boolean;
  track: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
};

export type CallConfig = {
  roomUrl: string;
  token: string;
  sessionId: string;
  asrMode: "daily" | "deepgram";
  canTranscribe: boolean;
  variant: "facilitator" | "patient" | "group";
  onLeaveHref?: string;
  initialSpeaking?: Record<string, number>;
  initialTranscript?: { patientId: string; text: string }[];
  /** Chrome for the floating self-view, which renders away from the live page. */
  facilitatorName?: string;
  cohortName?: string;
  sessionIndex?: number;
  cohortId?: string;
};

/**
 * Runs one Daily call. Pass null to stay idle — the hook holds no call and every value is inert,
 * which is what lets the provider mount everywhere and only connect once a session hands it config.
 */
export function useLiveCall(cfg: CallConfig | null) {
  const variant = cfg?.variant ?? "patient";
  const asrMode = cfg?.asrMode ?? "deepgram";
  const canTranscribe = cfg?.canTranscribe ?? false;
  const sessionId = cfg?.sessionId ?? "";
  const roomUrl = cfg?.roomUrl ?? "";
  const token = cfg?.token ?? "";
  const onLeaveHref = cfg?.onLeaveHref;
  const initialSpeaking = cfg?.initialSpeaking;
  const initialTranscript = cfg?.initialTranscript;

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
  // Whether the room's live transcription is actually running. `startTranscription()` returns void
  // and reports failure asynchronously on `transcription-error`, so a domain without transcription
  // enabled used to fail completely silently: the mic published fine, the tile went green, and the
  // transcript panel just sat on "Nothing yet" forever with nothing to distinguish it from a quiet
  // room. Nothing downstream works without this — the panel, the persisted Transcript rows, and the
  // AI-patient simulator's only channel for hearing the therapist all hang off transcription-message.
  const [asrState, setAsrState] = useState<"unknown" | "on" | "off" | "error">("unknown");
  const [asrError, setAsrError] = useState<string | null>(null);
  // Measured input energy from Daily's local audio-level observer, 0..1. A mic can hold a
  // perfectly healthy `playable` track and still carry pure silence — wrong input device selected,
  // OS input volume at zero, a headset that isn't really capturing. That case is indistinguishable
  // from "nobody has spoken yet" unless we measure it, and it's what makes a working room look
  // broken: green dot, live transcription, empty transcript.
  const [micLevel, setMicLevel] = useState(0);
  // Have we ever heard anything at all? Latches true on the first real sample, so a pause in
  // speech never retriggers the warning.
  const [heardAudio, setHeardAudio] = useState(false);
  // Which physical input the room is actually using. "Is it my MacBook mic or my headset?" is
  // unanswerable from inside the app otherwise — the browser picks a default that doesn't
  // necessarily match the OS default, and plugging in headphones mid-call may or may not switch it.
  const [micDevice, setMicDevice] = useState<string | null>(null);
  const [left, setLeft] = useState(false);

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
    let asrWatch: number | undefined;
    let asrRestart: number | undefined;

    // No session handed to us yet — the provider mounts on every therapist page, and most of
    // them have no call to run.
    if (!cfg) return;

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
      call.on("participant-joined", (e: any) => {
        rec(e?.participant?.user_id, "JOIN");
        refresh();
        // Re-point the running transcription instance at everyone currently in the room. Without
        // this a teen who joins after transcription started can sit outside its participant set and
        // never be transcribed — the same failure mode as the facilitator's own slow-acquiring mic.
        if (asrMode === "daily" && canTranscribe) {
          try {
            const ids = Object.values(call.participants() as any).map((p: any) => p.session_id).filter(Boolean);
            if (ids.length) call.updateTranscription({ participants: ids });
          } catch {
            // Instance may not be running yet; startTranscription covers the initial set.
          }
        }
      });
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
      // Speech peaks well above this; room tone and a dead device sit below it.
      const AUDIBLE = 0.02;
      // Device labels are only populated once mic permission has been granted, so read them after
      // join rather than up front, and again whenever the browser switches input.
      const readMic = () => {
        void call.getInputDevices().then((d: any) => {
          if (!disposed) setMicDevice(d?.mic?.label || null);
        }).catch(() => {});
      };
      call.on("selected-devices-updated", readMic);
      call.on("local-audio-level", (e: any) => {
        // daily-js types `audioLevel` as a number, but the event carries a STRING ("0.648590").
        // A `typeof === "number"` guard silently reads every sample as zero, which made a healthy
        // mic look dead — exactly the false alarm this meter exists to prevent. Coerce.
        const lvl = Number(e?.audioLevel);
        if (!Number.isFinite(lvl)) return;
        setMicLevel(lvl);
        if (lvl > AUDIBLE) setHeardAudio(true);
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
        // Daily ends a transcription instance on its own — when the room empties, when the
        // instance errors, or when another client stops it. Nothing used to bring it back, because
        // startTranscription() only ran once at mount: capture would work for a while and then go
        // quiet for the rest of the session with the clinician still sitting in the room talking.
        // Retries are bounded and backed off so a domain that genuinely can't transcribe (the
        // original bug) still settles into the "not running" state rather than looping forever.
        let asrTries = 0;
        const restartAsr = () => {
          if (disposed || asrTries >= 5) return;
          asrTries += 1;
          asrRestart = window.setTimeout(() => {
            if (disposed) return;
            try {
              call.startTranscription();
            } catch {
              /* the transcription-error handler schedules the next attempt */
            }
          }, 2000 * asrTries);
        };

        call.on("transcription-started", () => { asrTries = 0; setAsrState("on"); setAsrError(null); });
        call.on("transcription-stopped", () => { setAsrState("off"); restartAsr(); });
        call.on("transcription-error", (e: any) => {
          restartAsr();
          setAsrState("error");
          // Daily's own wording is the useful part here — "transcription is not enabled for this
          // domain" is a one-line answer to why the whole capture path is dead.
          setAsrError(e?.errorMsg || null);
        });
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
        // micOn/camOn were initialised before any session existed, so they defaulted to the
        // patient variant (muted). Without this the facilitator's controls — and the floating
        // self-view — report "Muted" while their tracks are plainly publishing.
        setMicOn(true);
        setCamOn(true);
      }
      refresh();
      // Cheap (a local AnalyserNode, no network) and the only way to tell a silent mic from a
      // quiet room. Failure here is not worth surfacing — it only costs us the meter.
      void call.startLocalAudioLevelObserver(250).catch(() => {});
      readMic();
      if (asrMode === "daily" && canTranscribe) {
        // Wait for our OWN audio track to be publishing before starting transcription. Daily binds
        // the transcription instance to the participants it can see audio for at start; a real
        // microphone takes a moment to acquire (permission, device start), so firing immediately
        // after join created an instance that excluded the very person who started it — mic live,
        // audio reaching the room, `transcription-started` fired, and not one word transcribed.
        // A synthetic/fake device acquires instantly, which is why this never showed up in testing.
        for (let i = 0; i < 40; i++) {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const local = (call.participants() as any)?.local;
          if (local?.tracks?.audio?.state === "playable") break;
          await new Promise((r) => setTimeout(r, 250));
          if (disposed) return;
        }
        try {
          call.startTranscription();
        } catch (e) {
          setAsrState("error");
          setAsrError(e instanceof Error ? e.message : null);
        }
        // Watchdog: startTranscription() is fire-and-forget, and a room that never starts also
        // never emits transcription-error — it just stays quiet. Without this the panel can't tell
        // "nobody has spoken yet" from "transcription never came up".
        asrWatch = window.setTimeout(() => setAsrState((s) => (s === "unknown" ? "off" : s)), 12_000);
      }
    };

    void setup();

    return () => {
      disposed = true;
      if (evInterval) window.clearInterval(evInterval);
      if (tick) window.clearInterval(tick);
      if (asrWatch) window.clearTimeout(asrWatch);
      if (asrRestart) window.clearTimeout(asrRestart);
      flushAll?.();
      const call = callRef.current;
      // Deliberately NOT stopping transcription here. Unmount fires on any navigation or reload,
      // and stopping is room-wide — one clinician refresh used to kill capture for every
      // participant. Daily ends transcription when the room empties or expires, which is the
      // correct lifetime for it.
      call?.destroy().catch(() => {});
      callRef.current = null;
    };
    // Keyed on the session, not on cfg identity: the live page re-renders a fresh config object
    // on every navigation back to it, and depending on identity would tear the call down and
    // rejoin each time — the exact churn this hook exists to prevent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.sessionId]);


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

  return {
    parts, speaking, transcript, activeSpeaker, elapsed, joined,
    micOn, camOn, deviceError, asrState, asrError, micLevel, heardAudio, micDevice, left,
    toggleMic, toggleCam, leave,
    config: cfg,
  };
}

export type LiveCall = ReturnType<typeof useLiveCall>;
