"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLiveCall, type CallConfig, type LiveCall } from "./use-live-call";
import { Video } from "./media";

// Ownership of the facilitator's Daily call, mounted on the therapist layout so it sits ABOVE the
// route. Clicking through to a cohort mid-session used to unmount LiveRoom, which destroyed the
// call — the clinician vanished from the room while every teen was still watching them, and
// capture stopped for the rest of the session. The call now belongs to the shell: the live page
// hands it credentials, and navigating elsewhere only changes what is drawn.

type SessionApi = {
  call: LiveCall;
  /** Idempotent — re-calling with the same sessionId does not restart the call. */
  join: (cfg: CallConfig) => void;
  activeSessionId: string | null;
};

const Ctx = createContext<SessionApi | null>(null);

/** Null outside the therapist shell (the patient views run their own call locally). */
export function useLiveSession(): SessionApi | null {
  return useContext(Ctx);
}

export function LiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<CallConfig | null>(null);
  const call = useLiveCall(cfg);

  const join = useCallback((next: CallConfig) => {
    // Comparing by sessionId, not object identity: the live page re-renders on every navigation
    // back to it and would otherwise tear down a perfectly good call and rejoin.
    setCfg((prev) => (prev?.sessionId === next.sessionId ? prev : next));
  }, []);

  // `left` means the clinician pressed Leave — drop the config so the mini-view disappears and a
  // later visit to the live page can start a fresh call rather than resurrecting the dead one.
  const activeSessionId = call.left ? null : cfg?.sessionId ?? null;

  const api = useMemo<SessionApi>(() => ({ call, join, activeSessionId }), [call, join, activeSessionId]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <FloatingSelfView />
    </Ctx.Provider>
  );
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

/**
 * Shown only while a session is live AND the clinician is looking at something else. On the live
 * page itself the full room is already on screen, so this would be a second copy of their own face.
 */
function FloatingSelfView() {
  const api = useContext(Ctx);
  const pathname = usePathname();
  const onLiveRoute = pathname?.includes("/live/") ?? false;

  if (!api || !api.activeSessionId || onLiveRoute) return null;
  const { call } = api;
  if (!call.joined) return null;

  const local = Object.values(call.parts).find((p) => p.local);
  const cfg = call.config;
  const backHref = cfg?.cohortId
    ? `/therapist/cohort/${cfg.cohortId}/live/${api.activeSessionId}`
    : null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 rounded-2xl overflow-hidden shadow-2xl"
      style={{ width: 232, background: "#0e2029", border: "1px solid #2e7a5f" }}
    >
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#12303a" }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#c1445b" }} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">Live</span>
        <span className="ml-auto text-[11.5px] tabular-nums" style={{ color: "#9db8bd" }}>
          {fmtClock(call.elapsed)}
        </span>
      </div>

      <div className="relative" style={{ height: 130, background: "#0d2731" }}>
        {local?.videoOn && local.track ? (
          <Video track={local.track} muted />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[11.5px]" style={{ color: "#7f9aa1" }}>
            {call.camOn ? "Camera starting…" : "Camera off"}
          </div>
        )}
        {/* The whole point of this panel is reassurance that the room still sees and hears you,
            so the mic state has to be the published track, not the button. */}
        <span
          className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10.5px] font-semibold"
          style={{ background: "#00000080", color: "#cfe0e2" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: !call.micOn ? "#b8556a" : local?.audioOn ? "#4bbf93" : "#e8a44b" }}
          />
          {!call.micOn ? "Muted" : local?.audioOn ? "Mic live" : "Mic not live"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-2" style={{ background: "#0b1a20" }}>
        <button
          onClick={call.toggleMic}
          className="flex-1 rounded-lg py-1.5 text-[11.5px] font-semibold"
          style={{ background: call.micOn ? "#1e4a56" : "#5a2530", color: "#fff" }}
        >
          {call.micOn ? "🎤" : "🔇"}
        </button>
        <button
          onClick={call.toggleCam}
          className="flex-1 rounded-lg py-1.5 text-[11.5px] font-semibold"
          style={{ background: call.camOn ? "#1e4a56" : "#5a2530", color: "#fff" }}
        >
          {call.camOn ? "📷" : "🚫"}
        </button>
        {backHref && (
          <a
            href={backHref}
            className="flex-1 rounded-lg py-1.5 text-[11.5px] font-semibold text-center"
            style={{ background: "#12463a", color: "#bfe9d5", border: "1px solid #2e7a5f" }}
          >
            Room
          </a>
        )}
        <button
          onClick={call.leave}
          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold text-white"
          style={{ background: "#c1445b" }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
