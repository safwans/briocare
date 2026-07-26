import Link from "next/link";
import { getDashboard } from "@/lib/queries";
import { focusLabel } from "@/components/parts";

export default async function TherapistDashboard() {
  const dash = await getDashboard();
  if (!dash) {
    return <div className="p-10 text-slate-500">No clinician seeded. Run <code>pnpm prisma db seed</code>.</div>;
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="px-10 py-8 max-w-6xl">
      <div className="text-sm text-slate-500">{today}</div>
      <h1 className="text-2xl font-bold tracking-tight">Good afternoon, {dash.clinicianName}</h1>
      <p className="text-slate-500 mt-1 max-w-2xl">
        {`Where each of your ${dash.totals.cohorts} groups stands right now — they meet on different days, so status is what matters here, not the calendar.`}
      </p>

      {/* Top counts */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <CountCard n={dash.topCounts.live} label="session live now" tone="dark" />
        <CountCard n={dash.topCounts.upcoming} label="upcoming next" tone="teal" />
        <CountCard n={dash.topCounts.notes} label="notes to review" tone="amber" />
        <CountCard n={dash.topCounts.checkIns} label="members at risk" tone="rose" />
      </div>

      {/* Cohort cards */}
      <div className="mt-6 text-[11px] uppercase tracking-wider text-slate-400">Your cohorts</div>
      <div className="mt-2 space-y-4">
        {dash.cohorts.map((c) => {
          const live = !!c.liveSession;
          return (
            <Link
              key={c.id}
              href={live && c.liveSessionId ? `/therapist/cohort/${c.id}/live/${c.liveSessionId}` : `/therapist/cohort/${c.id}`}
              className="block rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors"
              style={{ borderLeft: `4px solid ${live ? "#b8556a" : "#1c7b8c"}` }}
            >
              <div className="p-5 flex items-center gap-6">
                <div className="min-w-[220px]">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={live ? { background: "#b8556a", color: "#fff" } : { background: "#dcebec", color: "#1c6b78" }}
                  >
                    {live ? "● Live now" : c.latestIndex ? "Notes due" : "Upcoming"}
                  </span>
                  <div className="mt-1 font-bold text-lg">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.members} members · ages {c.ageLow}–{c.ageHigh}
                  </div>
                </div>
                <Field label="Session" value={live ? `S${c.liveSession!.index} in progress` : c.latestIndex ? `S${c.latestIndex} complete` : "—"} />
                <Field label="Focus" value={c.module || focusLabel(c.focus)} />
                <div className="min-w-[160px]">
                  <div className="text-[11px] text-slate-400">Needs attention</div>
                  <div className="text-sm font-semibold" style={{ color: "#b8556a" }}>
                    {c.checkIns} to check in <span className="text-slate-400 font-normal">· {c.notesToReview} notes</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <span
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: live ? "#b8556a" : "#1c6b78" }}
                  >
                    {live ? "Return to room" : "Open cohort"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CountCard({ n, label, tone }: { n: number; label: string; tone: "dark" | "teal" | "amber" | "rose" }) {
  const border = { dark: "#0e2029", teal: "#1c7b8c", amber: "#c2883a", rose: "#b8556a" }[tone];
  const dark = tone === "dark";
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: dark ? "#0e2029" : "#fff", borderColor: dark ? "#0e2029" : "#e2e8e9", borderLeft: `4px solid ${border}` }}
    >
      <div className="text-3xl font-bold" style={{ color: dark ? "#fff" : border }}>{n}</div>
      <div className={`text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[150px]">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}
