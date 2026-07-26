import { listCohorts, listTherapists, adminToolsEnabled } from "@/lib/admin";
import DeleteRowButton from "@/components/AdminDelete";
import { CohortGenerator } from "@/components/AdminActions";

const FOCUS: Record<string, string> = {
  SOCIAL_ANXIETY: "Social Anxiety",
  MOOD_DEPRESSION: "Mood & Depression",
  EMOTION_REGULATION: "Emotion Regulation",
};

export default async function CohortsPage() {
  const [rows, therapists] = await Promise.all([listCohorts(), listTherapists()]);
  const canDelete = adminToolsEnabled();
  return (
    <div className="max-w-4xl">
      <h1 className="text-[25px] font-bold tracking-tight text-[#14303a] mb-5">Cohorts</h1>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cdd8d6] bg-white/50 px-5 py-8 text-center text-[#5f727a] text-sm mb-6">
          No cohorts yet. Use “Generate cohort” — it also creates the patients and sessions.
        </div>
      ) : (
        <div className="rounded-[13px] bg-white border border-[#e2e8ea] overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wider text-[#8496a0] border-b border-[#eef2f2]">
                <th className="font-semibold px-5 py-3">Cohort</th>
                <th className="font-semibold px-5 py-3">Focus</th>
                <th className="font-semibold px-5 py-3">Schedule</th>
                <th className="font-semibold px-5 py-3">Facilitator</th>
                <th className="font-semibold px-5 py-3 text-right">Members</th>
                <th className="font-semibold px-5 py-3 text-right">Sessions</th>
                {canDelete && <th className="font-semibold px-5 py-3 text-right">&nbsp;</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#f2f5f5] last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-[#182226]">{r.code} · {FOCUS[r.focus] ?? r.focus}</div>
                    <div className="text-[12px] text-[#8496a0]">{r.name}</div>
                  </td>
                  <td className="px-5 py-3 text-[#5f727a]">{FOCUS[r.focus] ?? r.focus}</td>
                  <td className="px-5 py-3 text-[#5f727a]">{r.meetsOn}s · {r.meetsAt}</td>
                  <td className="px-5 py-3 text-[#5f727a]">{r.facilitator}</td>
                  <td className="px-5 py-3 text-right font-semibold text-[#135463]">{r.members}</td>
                  <td className="px-5 py-3 text-right text-[#5f727a]">{r.sessions}</td>
                  {canDelete && (
                    <td className="px-5 py-3 text-right">
                      <DeleteRowButton kind="cohort" id={r.id} label={`${r.code} · ${r.name}`} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-[15px] bg-[#eef4f3] border border-[#dfe8e6] p-6">
        <div className="font-bold text-[16px] text-[#14303a] mb-4">Quick-create a cohort</div>
        <CohortGenerator therapists={therapists} />
      </div>
    </div>
  );
}
