"use client";

import { useState } from "react";
import Link from "next/link";

type SessionOpt = { index: number; isNewest: boolean; tag: string; hasNotes: boolean };

export default function NoteSessionPicker({
  cohortId, current, sessionTag, sessions, carry,
}: {
  cohortId: string;
  current: number;
  sessionTag: string;
  sessions: SessionOpt[];
  /**
   * Query fragment identifying what is selected right now — `patient=<id>` for a member, or
   * `note=group` for the group note. Appended to every session link so changing session keeps
   * you on the same thing you were reading. Note ids can't do this job: they're per-session.
   */
  carry?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[#135463] bg-[#e5f1f2] border border-[#c9e2e5]"
      >
        Session {current}{sessionTag}
        <span className="text-[9px] transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-20 min-w-[200px] max-h-[250px] overflow-y-auto rounded-xl bg-white border border-slate-200 p-1.5 shadow-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2.5 py-1.5">Session history</div>
          {sessions.map((s) => (
            <Link
              key={s.index}
              href={`/therapist/cohort/${cohortId}/notes?session=${s.index}${carry ? `&${carry}` : ""}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${s.index === current ? "bg-slate-50" : "hover:bg-slate-50"}`}
            >
              <span className={`font-semibold ${s.hasNotes ? "text-[#24343b]" : "text-slate-500"}`}>Session {s.index}</span>
              <span
                className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={
                  !s.hasNotes
                    ? { color: "#7a6a2e", background: "#f6f0da" }
                    : s.isNewest
                    ? { color: "#135463", background: "#e5f1f2" }
                    : { color: "#3f9a7d", background: "#e7f3ee" }
                }
              >
                {s.tag}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
