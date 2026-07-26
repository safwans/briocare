import Link from "next/link";
import { notFound } from "next/navigation";
import { getCohortCaseload, attendedTrend } from "@/lib/queries";
import { STATUS_META, BUCKETS, deltaPct } from "@/lib/status";
import { StatusChip, Sparkline, focusLabel, HelpLabel } from "@/components/parts";

export default async function CohortReviewPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  const data = await getCohortCaseload(cohortId);
  if (!data) notFound();
  const { cohort, rows } = data;

  const counts = { falling: 0, watch: 0, stable: 0 };
  const names: Record<string, string[]> = { falling: [], watch: [], stable: [] };
  for (const r of rows) {
    const b = STATUS_META[r.status].bucket;
    counts[b]++;
    names[b].push(r.name.split(" ")[0]);
  }
  const attention = new Set(["ABSENT", "CHECK_IN", "WATCH", "WORTH_A_LOOK"]);
  const priority = rows.filter((r) => attention.has(r.status)).map((r) => r.name.split(" ")[0]);
  const absent = rows.filter((r) => !r.presentLast).map((r) => r.name.split(" ")[0]);

  const live = !!cohort.liveSessionId;
  // The band describes the session you're about to run, so it reads from nextIndex — not
  // currentIndex, which is the most recent *completed* session and belongs to the trends line
  // above. When a cohort has finished its schedule there is no next session, so say so rather
  // than labelling the last completed one "Next up".
  const bandIndex = live ? cohort.currentIndex : cohort.nextIndex;
  const bandModule = live ? cohort.module : cohort.nextModule;
  const bandLabel = live ? "Session live now" : cohort.nextIndex ? "Next up" : "Programme complete";
  const bandAccent = live ? "#e79aa9" : "#8fd0da";
  const cta = live
    ? { label: "Return to live room", href: `/therapist/cohort/${cohortId}/live/${cohort.liveSessionId}` }
    : { label: "Review notes", href: `/therapist/cohort/${cohortId}/notes` };

  return (
    <div className="px-10 py-8 max-w-5xl">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">Cohort overview</div>
      <h1 className="text-2xl font-bold tracking-tight">{cohort.code} · {focusLabel(cohort.focus)}</h1>
      <div className="text-sm text-slate-500 mt-1">
        {cohort.meetsOn}s {cohort.meetsAt} · ages {cohort.ageLow}–{cohort.ageHigh} · {cohort.members} members
      </div>
      {cohort.currentIndex ? (
        <div className="text-xs text-slate-400 mt-1">
          Trends below span all {cohort.currentIndex} sessions so far · updated after the most recent (Session {cohort.currentIndex})
        </div>
      ) : null}
      <p className="text-sm text-slate-500 mt-3 max-w-2xl">
        Between-session engagement signal. Participation is a behavioral proxy — talk time, turns, camera,
        presence — trended against each member&apos;s <em>own</em> baseline. It flags who&apos;s worth a look.
        You decide what it means.
      </p>

      {/* Next-session prep band */}
      <div className="mt-5 rounded-2xl px-6 py-4 flex flex-wrap items-center gap-6" style={{ background: "#12303a", color: "#cfe0e2" }}>
        <div className="min-w-[130px]">
          <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: bandAccent }}>{bandLabel}</div>
          <div className="text-lg font-bold text-white">{bandIndex ? `Session ${bandIndex}` : "—"}</div>
        </div>
        <div className="w-px self-stretch bg-[#1e4a56]" />
        <Band label="Focus" value={bandModule || focusLabel(cohort.focus)} />
        <div className="w-px self-stretch bg-[#1e4a56]" />
        <Band label="Priority to draw in" value={priority.length ? priority.join(", ") : "None flagged"} />
        <div className="w-px self-stretch bg-[#1e4a56]" />
        <Band label="Absent last session" value={absent.length ? absent.join(", ") : "None"} />
        <Link href={cta.href} className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: live ? "#b8556a" : "#1c6b78" }}>
          {cta.label}
        </Link>
      </div>

      {/* Buckets */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {BUCKETS.map((b) => (
          <div key={b.key} className="rounded-2xl bg-white border border-slate-200 p-4" style={{ borderLeft: `3px solid ${b.color}` }}>
            <div className="text-sm font-semibold text-slate-500">{b.title}</div>
            <div className="text-3xl font-bold mt-1" style={{ color: b.color }}>{counts[b.key]}</div>
            <div className="text-xs text-slate-500 mt-1 min-h-[16px]">
              {b.key === "stable" ? "Holding at or above baseline" : names[b.key].slice(0, 3).join(", ")}
            </div>
          </div>
        ))}
      </div>

      {/* Roster table — rows link to kid detail */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[2.2fr_1.4fr_1fr_1fr_1.1fr] gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          <span>Member</span>
          <HelpLabel label="Participation trend" />
          <HelpLabel label="Vs. baseline" />
          <span>Last session</span>
          <span>Status</span>
        </div>
        {rows.map((r) => {
          // Compare only the sessions they were in. Including a missed session put a 0 in both the
          // baseline and the latest value, so one absence out of three read as a total collapse.
          const seen = attendedTrend(r);
          const d = deltaPct(seen);
          const missed = r.trend.length - seen.length;
          const meta = STATUS_META[r.status];
          return (
            <Link
              key={r.patientId}
              href={`/therapist/cohort/${cohortId}/kid/${r.patientId}`}
              className="grid grid-cols-[2.2fr_1.4fr_1fr_1fr_1.1fr] gap-3 px-6 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {r.name.split(" ").map((s) => s[0]).join("")}
                </span>
                <div className="leading-tight">
                  <div className="font-medium text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">Age {r.age} · {r.presentLast ? "present" : "absent"}</div>
                </div>
              </div>
              <Sparkline trend={seen} color={meta.color} />
              <span className="font-semibold" style={{ color: d !== null && d < 0 ? meta.color : "#3f9a7d" }}>
                {d === null ? (
                  <span className="text-slate-400 font-normal text-sm">
                    {seen.length < 3 ? `${seen.length} attended` : "—"}
                  </span>
                ) : (
                  <>
                    {`${d > 0 ? "+" : ""}${Math.round(d * 100)}%`}
                    {missed > 0 && (
                      <span className="block text-[11px] font-normal text-slate-400">
                        {missed} missed, excluded
                      </span>
                    )}
                  </>
                )}
              </span>
              <span className="text-slate-600 text-sm">{r.presentLast ? `${(r.latestTalkS / 60).toFixed(1)} min talk` : "0m · absent"}</span>
              <StatusChip status={r.status} />
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Signals are proxies, not diagnoses. BrioCare never labels a member “disengaged” — it surfaces a trend for your clinical judgment.
      </p>
    </div>
  );
}

function Band({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-[#6a8b93] mb-1">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
