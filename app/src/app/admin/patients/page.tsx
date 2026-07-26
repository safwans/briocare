import { listPatients } from "@/lib/admin";
import { QuickAddButtons } from "@/components/AdminActions";
import DeleteRowButton from "@/components/AdminDelete";
import { adminToolsEnabled } from "@/lib/admin";

export default async function PatientsPage() {
  const rows = await listPatients();
  const canDelete = adminToolsEnabled();
  return (
    <div className="max-w-4xl">
      <h1 className="text-[25px] font-bold tracking-tight text-[#14303a] mb-5">Patients</h1>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cdd8d6] bg-white/50 px-5 py-8 text-center text-[#5f727a] text-sm mb-6">
          No patients yet.
        </div>
      ) : (
        <div className="rounded-[13px] bg-white border border-[#e2e8ea] overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wider text-[#8496a0] border-b border-[#eef2f2]">
                <th className="font-semibold px-5 py-3">Name</th>
                <th className="font-semibold px-5 py-3 text-right">Age</th>
                <th className="font-semibold px-5 py-3">Cohort</th>
                {canDelete && <th className="font-semibold px-5 py-3 text-right">&nbsp;</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#f2f5f5] last:border-0">
                  <td className="px-5 py-3 font-semibold text-[#182226]">{r.name}</td>
                  <td className="px-5 py-3 text-right text-[#5f727a]">{r.age}</td>
                  <td className="px-5 py-3">
                    {r.cohort === "Unassigned" ? (
                      <span className="text-[#a08b6a] text-[13px] font-medium">Unassigned</span>
                    ) : (
                      <span className="text-[#5f727a]">{r.cohort}</span>
                    )}
                  </td>
                  {canDelete && (
                    <td className="px-5 py-3 text-right">
                      <DeleteRowButton kind="patient" id={r.id} label={r.name} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <QuickAddButtons />
    </div>
  );
}
