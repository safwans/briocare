import { getAdminCounts } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";
import { SidebarActions } from "@/components/AdminActions";

// Every admin screen reads live counts and rosters from the database. Without this Next
// prerenders them at build time, which both needs a reachable database during `next build`
// (there isn't one in the container image) and would freeze the numbers at build time.
// Applies to this segment and everything under it.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const counts = await getAdminCounts();
  return (
    <div className="min-h-screen flex" style={{ background: "#f3f5f4" }}>
      <aside className="w-64 shrink-0 flex flex-col gap-6 p-5 text-white" style={{ background: "#0f333b" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#2fa4b8] text-[#06222b] text-sm font-bold">◎</span>
            <span className="font-bold text-lg tracking-tight">BrioCare</span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-[#6f959c] mt-1 ml-9">Admin console</div>
        </div>
        <AdminNav counts={counts} />
        <SidebarActions />
      </aside>
      <main className="flex-1 min-w-0 p-8 md:p-10 overflow-x-auto">{children}</main>
    </div>
  );
}
