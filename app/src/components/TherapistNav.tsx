"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { focusLabel } from "@/components/parts";

export type NavCohort = {
  id: string;
  code: string;
  focus: string;
  meetsOn: string;
  members: number;
  ageLow: number;
  ageHigh: number;
  currentSessionId: string | null;
  liveSessionId: string | null;
  notesToReview: number;
  checkIns: number;
};

const ACCENTS = ["#2fa4b8", "#4a90a4", "#6bb1bd", "#5a9bb0", "#7fb1bd"];

// Active-cohort dropdown + the 3-step Session Workflow (Cohort → Live room → Note review), scoped
// to the active cohort. Matches the therapist design mock.
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
  // `code · focus` is the one cohort title used everywhere (cohort page h1, live room, dashboard
  // cards, admin) — Cohort.name is a generated "Monday PM · Social Anxiety" string that collides
  // between cohorts sharing a day and focus, so it can't be the label a therapist picks from.
  const titleOf = (c: NavCohort) => `${c.code} · ${focusLabel(c.focus)}`;
  // From meetsOn, not the name's first word — a cohort named anything but "<Day> PM · …" (admin
  // takes a free-text name) would otherwise print its first word plus an "s".
  const subOf = (c: NavCohort) => `${c.meetsOn}s · ${c.members} members`;

  const base = `/therapist/cohort/${active.id}`;
  const steps = [
    { n: 1, label: "Cohort", href: base, is: !!routeCohortId && (sub === "review" || sub === "kid"), badge: null as null | { text: string; live?: boolean } },
    { n: 2, label: "Live room", href: active.currentSessionId ? `${base}/live/${active.currentSessionId}` : base, is: sub === "live", badge: active.liveSessionId ? { text: "live", live: true } : null },
    { n: 3, label: "Note review", href: `${base}/notes`, is: sub === "notes", badge: active.notesToReview > 0 ? { text: String(active.notesToReview) } : null },
  ];

  return (
    <>
      {/* Home */}
      <Link
        href="/therapist"
        className={`flex items-center rounded-[10px] px-3 py-[9px] text-[15px] font-semibold ${onHome ? "bg-[#1c7b8c] text-white" : "text-[#a9c6cc] hover:bg-[#163944]"}`}
      >
        <span className="relative w-[15px] h-[15px] rounded shrink-0 border-2 border-current mr-[11px]">
          <span className="absolute left-0.5 right-0.5 top-[3px] h-0.5 bg-current" />
        </span>
        Home
        {homeBadge > 0 && (
          <span className="ml-auto grid place-items-center min-w-5 h-5 px-1 rounded-full bg-[#b8556a] text-white text-[11px] font-bold">{homeBadge}</span>
        )}
      </Link>

      {/* Cohort selector */}
      <div className="pt-[22px]">
        <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a8b93]">
          {onHome ? "Cohort" : "Active cohort"}
        </div>
        <div className="relative">
          {/* With no cohort chosen the trigger reads as an empty slot — dashed outline, muted
              accent bar — rather than a filled control, so it doesn't look like a selection has
              already been made. Picking one swaps it to the solid card with that cohort's accent. */}
          <button
            onClick={() => setOpen((o) => !o)}
            className={`w-full flex items-center gap-[11px] rounded-xl px-3 py-3 text-left ${
              onHome ? "bg-[#0f2a33] border border-dashed border-[#2c5561]" : "bg-[#163944] border border-[#1e4a56]"
            }`}
          >
            <span className="w-[9px] h-[30px] rounded shrink-0" style={{ background: onHome ? "#3a5a64" : ACCENTS[activeIdx % ACCENTS.length] }} />
            <span className="flex-1 min-w-0 leading-tight">
              <span className="block text-[13.5px] font-bold text-white truncate">{onHome ? "Select cohort" : titleOf(active)}</span>
              <span className="block text-[11.5px] text-[#7f9aa1]">
                {onHome ? `${cohorts.length} ${cohorts.length === 1 ? "group" : "groups"}` : subOf(active)}
              </span>
            </span>
            <span className={`text-sm transition-transform text-[#7f9aa1] ${open ? "rotate-180" : ""}`}>▾</span>
          </button>
          {open && (
            <div className="absolute z-30 top-[calc(100%+6px)] left-0 right-0 rounded-xl bg-[#0f2a33] border border-[#1e4a56] p-[5px] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]">
              {cohorts.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/therapist/cohort/${c.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[#173e49] ${!onHome && c.id === active.id ? "bg-[#173e49]" : ""}`}
                >
                  <span className="w-[7px] h-[26px] rounded shrink-0" style={{ background: ACCENTS[i % ACCENTS.length] }} />
                  <span className="flex-1 min-w-0 leading-tight">
                    <span className="block text-[13px] font-bold text-white truncate">{titleOf(c)}</span>
                    <span className="block text-[11.5px] text-[#7f9aa1]">{subOf(c)}</span>
                  </span>
                  {c.checkIns > 0 && (
                    <span className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-[#b8556a] text-white text-[11px] font-bold">{c.checkIns}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session workflow */}
      <div className="pt-[22px]">
        <div className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a8b93]">Session workflow</div>
        <div className="px-2.5 pb-2.5 text-[11.5px] text-[#5f8089]">Cohort → live room → notes</div>
        <nav className="flex flex-col gap-[3px]">
          {steps.map((s) =>
            onHome ? (
              // No cohort selected — steps are not actionable until one is picked.
              <div
                key={s.n}
                aria-disabled
                title="Select a cohort first"
                className="flex items-center gap-3 rounded-[10px] px-3 py-[9px] opacity-40 cursor-not-allowed"
              >
                <span className="grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold border border-[#3c5f6a] text-[#6a8b93]">{s.n}</span>
                <span className="flex-1 text-[15px] font-semibold text-[#a9c6cc]">{s.label}</span>
              </div>
            ) : (
              <Link
                key={s.n}
                href={s.href}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-[9px] text-[15px] font-semibold ${s.is ? "bg-[#1c7b8c] text-white" : "text-[#a9c6cc] hover:bg-[#163944]"}`}
              >
                <span className={`grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold ${s.is ? "bg-white/20 text-white" : "border border-[#3c5f6a] text-[#a9c6cc]"}`}>{s.n}</span>
                <span className="flex-1">{s.label}</span>
                {s.badge && (
                  <span className="grid place-items-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold" style={{ background: "#b8556a", color: "#fff" }}>
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
