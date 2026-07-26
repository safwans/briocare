"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { focusLabel } from "@/components/parts";

export type NavCohort = {
  id: string;
  code: string;
  name: string;
  focus: string;
  members: number;
  ageLow: number;
  ageHigh: number;
  currentSessionId: string | null;
  liveSessionId: string | null;
  notesToReview: number;
};

const ACCENTS = ["#2fa4b8", "#4a90a4", "#6bb1bd", "#5a9bb0", "#7fb1bd"];
const dayOf = (name: string) => name.split(" ")[0];

// Active-cohort dropdown + the 4-step Session Workflow (Cohort review → Session prep → Live room →
// Note review), scoped to the active cohort. Matches the therapist design mock.
export default function TherapistNav({ cohorts, homeBadge = 0 }: { cohorts: NavCohort[]; homeBadge?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const seg = pathname.split("/"); // ['', 'therapist', 'cohort', id, sub?]
  const routeCohortId = seg[2] === "cohort" ? seg[3] : null;
  const sub = seg[2] === "cohort" ? (seg[4] ?? "review") : null; // review | live | notes | kid

  const onHome = seg[2] !== "cohort";
  const active =
    cohorts.find((c) => c.id === routeCohortId) ??
    cohorts.find((c) => c.liveSessionId) ??
    cohorts[0];
  if (!active) return null;
  const activeIdx = Math.max(0, cohorts.findIndex((c) => c.id === active.id));
  const titleOf = (c: NavCohort) => `${c.code} · ${focusLabel(c.focus)}`;
  const subOf = (c: NavCohort) => `${dayOf(c.name)}s · ${c.members} members`;

  const base = `/therapist/cohort/${active.id}`;
  const steps = [
    { n: 1, label: "Cohort", href: base, is: !!routeCohortId && (sub === "review" || sub === "kid"), badge: null as null | { text: string; live?: boolean } },
    { n: 2, label: "Live room", href: active.currentSessionId ? `${base}/live/${active.currentSessionId}` : base, is: sub === "live", badge: active.liveSessionId ? { text: "live", live: true } : null },
    { n: 3, label: "Note review", href: `${base}/notes`, is: sub === "notes", badge: active.notesToReview > 0 ? { text: String(active.notesToReview) } : null },
  ];

  return (
    <>
      {/* Home */}
      <div className="mt-4 px-4">
        <Link
          href="/therapist"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm ${onHome ? "bg-[#1c7b8c] text-white" : "text-slate-200 hover:bg-[#12303a]"}`}
        >
          <span>▤ Home</span>
          {homeBadge > 0 && (
            <span className="ml-auto grid place-items-center min-w-5 h-5 px-1 rounded-full bg-[#b8556a] text-white text-[11px] font-semibold">{homeBadge}</span>
          )}
        </Link>
      </div>

      {/* Cohort selector */}
      <div className="mt-4 px-4">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">{onHome ? "Cohort" : "Active cohort"}</div>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center gap-2 rounded-xl bg-[#12303a] px-3 py-2 text-left"
          >
            <span className="w-[9px] h-8 rounded-full shrink-0" style={{ background: onHome ? "#3a5a64" : ACCENTS[activeIdx % ACCENTS.length] }} />
            <span className="flex-1 min-w-0 leading-tight">
              <span className="block text-sm font-semibold text-white truncate">{onHome ? "Select cohort" : titleOf(active)}</span>
              <span className="block text-xs text-slate-400">{onHome ? `${cohorts.length} groups` : subOf(active)}</span>
            </span>
            <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
          </button>
          {open && (
            <div className="absolute z-10 mt-1 w-full rounded-xl bg-[#12303a] border border-[#1e4a56] overflow-hidden shadow-xl">
              {cohorts.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/therapist/cohort/${c.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-[#173e49] ${!onHome && c.id === active.id ? "bg-[#173e49]" : ""}`}
                >
                  <span className="w-[9px] h-7 rounded-full shrink-0" style={{ background: ACCENTS[i % ACCENTS.length] }} />
                  <span className="flex-1 min-w-0 leading-tight">
                    <span className="block text-sm font-medium text-white truncate">{titleOf(c)}</span>
                    <span className="block text-xs text-slate-400">{subOf(c)}</span>
                  </span>
                  {c.notesToReview > 0 && (
                    <span className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-[#b8556a] text-white text-[11px] font-semibold">{c.notesToReview}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session workflow */}
      <div className="mt-5 px-4">
        <div className="text-[11px] uppercase tracking-wider text-slate-400">Session workflow</div>
        <div className="text-[11px] text-slate-500 mb-2">Cohort review → prep → live → notes</div>
        <nav className="space-y-0.5">
          {steps.map((s) =>
            onHome ? (
              // No cohort selected — steps are not actionable until one is picked.
              <div
                key={s.n}
                aria-disabled
                title="Select a cohort first"
                className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-40 cursor-not-allowed"
              >
                <span className="grid place-items-center w-6 h-6 rounded-full text-[11px] font-semibold border border-slate-600 text-slate-500">{s.n}</span>
                <span className="flex-1 text-sm text-slate-400">{s.label}</span>
              </div>
            ) : (
              <Link
                key={s.n}
                href={s.href}
                className={`flex items-center gap-3 rounded-lg px-2 py-2 ${s.is ? "bg-[#12303a]" : "hover:bg-[#12303a]"}`}
              >
                <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] font-semibold ${s.is ? "bg-[#1c7b8c] text-white" : "border border-slate-600 text-slate-400"}`}>{s.n}</span>
                <span className={`flex-1 text-sm ${s.is ? "text-white font-medium" : "text-slate-200"}`}>{s.label}</span>
                {s.badge && (
                  <span className="grid place-items-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold" style={{ background: "#b8556a", color: "#fff" }}>
                    {s.badge.live ? "● live" : s.badge.text}
                  </span>
                )}
              </Link>
            )
          )}
        </nav>
      </div>
    </>
  );
}
