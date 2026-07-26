import { listSessions } from "@/lib/admin";

// One entry per SessionStatus (prisma/schema.prisma) — a missing key renders the raw enum name.
const STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Scheduled", cls: "bg-[#eef2f2] text-[#5f727a]" },
  LIVE: { label: "Live", cls: "bg-[#fde2d9] text-[#c05a2e]" },
  ENDED: { label: "Ended", cls: "bg-[#e7eef0] text-[#4a6670]" },
  PROCESSING: { label: "Processing", cls: "bg-[#eef0d9] text-[#7a7a2e]" },
  READY: { label: "Ready", cls: "bg-[#e3f1ec] text-[#2f7d5f]" },
  FAILED: { label: "Failed", cls: "bg-[#fbeef1] text-[#b8556a]" },
};

export default async function SessionsPage() {
  const rows = await listSessions();
  return (
    <div className="max-w-4xl">
      <h1 className="text-[25px] font-bold tracking-tight text-[#14303a] mb-5">Sessions</h1>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cdd8d6] bg-white/50 px-5 py-8 text-center text-[#5f727a] text-sm">
          No sessions yet. Generating a cohort creates its full schedule automatically.
        </div>
      ) : (
        <div className="rounded-[13px] bg-white border border-[#e2e8ea] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wider text-[#8496a0] border-b border-[#eef2f2]">
                <th className="font-semibold px-5 py-3">Cohort</th>
                <th className="font-semibold px-5 py-3 text-right">#</th>
                <th className="font-semibold px-5 py-3">Module</th>
                <th className="font-semibold px-5 py-3">Status</th>
                <th className="font-semibold px-5 py-3 text-right">Present</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, cls: "bg-[#eef2f2] text-[#5f727a]" };
                return (
                  <tr key={r.id} className="border-b border-[#f2f5f5] last:border-0">
                    <td className="px-5 py-3 font-semibold text-[#182226]">{r.cohort}</td>
                    <td className="px-5 py-3 text-right text-[#5f727a]">{r.index}</td>
                    <td className="px-5 py-3 text-[#5f727a]">{r.module}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[#5f727a]">{r.present}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
