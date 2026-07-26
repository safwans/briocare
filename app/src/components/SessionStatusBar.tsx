"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Persistent status bar shown across a cohort's screens while a session is live (matches the mock's
// SESSION STATUS BAR). Hidden inside the live room itself.
export default function SessionStatusBar({
  cohortId, liveSessionId, liveSessionIndex,
}: {
  cohortId: string;
  liveSessionId: string | null;
  liveSessionIndex: number | null;
}) {
  const pathname = usePathname();
  if (!liveSessionId) return null;
  if (pathname.includes("/live/")) return null;

  return (
    <div className="flex items-center justify-between px-10 py-3" style={{ background: "#b8556a", color: "#fff" }}>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Session {liveSessionIndex} is in progress
        </span>
        <span className="text-sm text-white/80">you are facilitating</span>
      </div>
      <Link href={`/therapist/cohort/${cohortId}/live/${liveSessionId}`} className="rounded-lg px-4 py-1.5 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.18)" }}>
        Return to room
      </Link>
    </div>
  );
}
