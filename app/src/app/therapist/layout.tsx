import { getDashboard } from "@/lib/queries";
import TherapistNav, { type NavCohort } from "@/components/TherapistNav";

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const dash = await getDashboard();
  const initials = dash ? dash.clinicianName.split(" ").map((s) => s[0]).slice(-2).join("") : "–";
  const navCohorts: NavCohort[] = (dash?.cohorts ?? []).map((c) => ({
    id: c.id, code: c.code, name: c.name, focus: c.focus,
    members: c.members, ageLow: c.ageLow, ageHigh: c.ageHigh,
    currentSessionId: c.currentSessionId, liveSessionId: c.liveSessionId, notesToReview: c.notesToReview,
  }));

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-[#0e2029] text-white flex flex-col">
        <div className="px-6 py-5 flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#1c7b8c] text-white text-sm font-bold">◎</span>
          <span className="font-bold text-lg tracking-tight">BrioCare</span>
        </div>

        {dash && (
          <div className="mx-4 rounded-xl bg-[#12303a] p-3">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-full bg-[#1c7b8c] font-bold">{initials}</span>
              <div className="leading-tight">
                <div className="font-semibold text-sm">{dash.clinicianName}</div>
                <div className="text-xs text-slate-300">{dash.credential} · Group Facilitator</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat n={dash.totals.cohorts} label="cohorts" />
              <Stat n={dash.totals.members} label="members" />
              <Stat n={dash.totals.checkIns} label="to check in" accent />
            </div>
          </div>
        )}

        {/* Home + Active cohort + Session workflow */}
        <TherapistNav cohorts={navCohorts} homeBadge={dash?.topCounts.checkIns ?? 0} />

        <div className="mt-auto px-6 py-4 text-xs text-slate-400 flex gap-4">
          <span>Settings</span>
          <span>Help</span>
          <span className="ml-auto">Sign out</span>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-[#0e2029] py-2">
      <div className={`text-lg font-bold ${accent ? "text-[#e79aa9]" : "text-white"}`}>{n}</div>
      <div className="text-[10px] text-slate-400 leading-tight">{label}</div>
    </div>
  );
}
