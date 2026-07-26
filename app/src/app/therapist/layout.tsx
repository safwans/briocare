import Link from "next/link";
import { getDashboard } from "@/lib/queries";
import TherapistNav, { type NavCohort } from "@/components/TherapistNav";
import { LiveSessionProvider } from "@/components/LiveSession";

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const dash = await getDashboard();
  const initials = dash ? dash.clinicianName.split(" ").map((s) => s[0]).slice(-2).join("") : "–";
  const navCohorts: NavCohort[] = (dash?.cohorts ?? []).map((c) => ({
    id: c.id, code: c.code, focus: c.focus, meetsOn: c.meetsOn,
    members: c.members, ageLow: c.ageLow, ageHigh: c.ageHigh,
    currentSessionId: c.currentSessionId, liveSessionId: c.liveSessionId,
    notesToReview: c.notesToReview, checkIns: c.checkIns,
  }));

  // The Home badge counts things to act on, not people: a room that's live plus each cohort with
  // notes waiting. Members needing a check-in are surfaced on the dashboard itself, so counting
  // them here would double-report the same signal in two places.
  const homeBadge = (dash?.cohorts ?? []).filter((c) => c.liveSessionId || c.notesToReview > 0).length;

  return (
    // The provider sits above the routes so a live call survives clicking through to a cohort.
    <LiveSessionProvider>
    <div className="flex min-h-screen">
      <aside className="w-[262px] shrink-0 bg-[#12303a] text-[#cfe0e2] flex flex-col px-4 py-5 overflow-y-auto">
        <Link href="/therapist" className="px-2.5 pt-1 pb-5 flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <span
            className="grid place-items-center w-[30px] h-[30px] rounded-[9px]"
            style={{ background: "linear-gradient(150deg, #2fa4b8, #135463)" }}
          >
            <span className="block w-[11px] h-[11px] rounded-full border-[2.5px] border-white" />
          </span>
          <span className="font-bold text-[19px] tracking-tight text-white">BrioCare</span>
        </Link>

        {/* Home + Cohort selector + Session workflow */}
        <TherapistNav cohorts={navCohorts} homeBadge={homeBadge} />

        <div className="mt-auto pt-5">
          {dash && (
            <div className="flex items-center gap-[11px] px-2.5 py-3 border-t border-[#1e4a56]">
              <span
                className="grid place-items-center w-9 h-9 rounded-full font-bold text-sm shrink-0 text-[#06222b]"
                style={{ background: "linear-gradient(150deg,#4fc0d1,#2fa4b8)" }}
              >
                {initials}
              </span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-[13.5px] font-bold text-white truncate">{dash.clinicianName}</div>
                <div className="text-[11.5px] text-[#7f9aa1]">{dash.credential} · Group Facilitator</div>
              </div>
            </div>
          )}
          <div className="px-2.5 pt-1 pb-0.5 text-[12.5px] text-[#7f9aa1] flex gap-4">
            <span>Settings</span>
            <span>Help</span>
            <span className="ml-auto">Sign out</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
    </LiveSessionProvider>
  );
}
