"use client";

import { useState } from "react";
import Link from "next/link";
import LiveRoom from "./LiveRoomLazy";
import type { RosterMember } from "./LiveRoom";

type Props = {
  patientId: string;
  patientName: string;
  groupLabel: string;
  therapistName: string;
  therapistInitials: string;
  sessionId: string | null;
  live: boolean;
  roster: RosterMember[];
  roomUrl: string | null;
  token: string | null;
  /** Forwarded so the teen's client also captures transcription (redundant capture). */
  asrMode?: "daily" | "deepgram";
};

export default function GroupExperience({
  patientId, patientName, groupLabel, therapistName, therapistInitials,
  sessionId, live, roster, roomUrl, token, asrMode,
}: Props) {
  const [joined, setJoined] = useState(false);
  // `live` is load-bearing, not decoration: without it a teen can join a room for a session that
  // hasn't started, where no therapist will ever appear.
  const canJoin = live && !!(sessionId && roomUrl && token);

  if (joined && canJoin) {
    return (
      <LiveRoom
        variant="group"
        asrMode={asrMode}
        roomUrl={roomUrl!}
        token={token!}
        sessionId={sessionId!}
        roster={roster}
        myPatientId={patientId}
        patientName={patientName}
        groupLabel={groupLabel}
        facilitatorName={therapistName}
        therapistInitials={therapistInitials}
        onLeaveHref="/patient"
      />
    );
  }

  // ---------- LOBBY ----------
  return (
    <div className="max-w-md mx-auto px-5 py-10 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="relative w-20 h-20 mb-6">
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#2fa4b8", opacity: 0.4 }} />
        <span className="absolute inset-0 rounded-full grid place-items-center" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)" }}>
          <span className="w-6 h-6 rounded-full" style={{ border: "3px solid #0f333b" }} />
        </span>
      </div>
      <div className="text-[12px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "#1c7b8c" }}>
        {live ? "Your group is live" : "Group starts soon"}
      </div>
      <div className="text-2xl font-bold tracking-tight mb-2.5 text-[#14303a]">
        {live ? "Ready to join?" : "Almost time"}
      </div>
      <p className="text-[15px] leading-relaxed text-[#52655f] mb-1">{groupLabel} · with {therapistName}</p>
      <p className="text-sm leading-relaxed text-[#7c8f89] max-w-xs mb-7">
        Your camera and mic stay off until you&apos;re ready. You can always pass when it&apos;s your turn.
      </p>
      {canJoin ? (
        <button onClick={() => setJoined(true)} className="w-full max-w-xs rounded-2xl px-6 py-4 font-bold text-white" style={{ background: "#ef7d5a" }}>
          Join group
        </button>
      ) : (
        <div className="w-full max-w-xs rounded-2xl px-6 py-4 font-bold text-center" style={{ background: "#e6ded1", color: "#8a7f6c" }}>
          No session live right now
        </div>
      )}
      <Link href="/patient/checkin" className="mt-3 text-sm font-semibold text-[#135463] py-2">Do my check-in first</Link>
    </div>
  );
}
