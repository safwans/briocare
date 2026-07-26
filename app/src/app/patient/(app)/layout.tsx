import PatientTabs from "@/components/PatientTabs";
import { getPatientHome } from "@/lib/patient";

// Responsive patient shell: top nav on desktop (md+), bottom tab bar on mobile. Warm, teen-facing.
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const home = await getPatientHome();

  return (
    <div className="min-h-screen" style={{ background: "#f4efe6" }}>
      {/* Top bar (desktop) */}
      <header className="hidden md:flex items-center gap-4 px-8 py-4 bg-white border-b border-[#ece3d6]">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#1c7b8c] text-white text-sm font-bold">◎</span>
          <span className="font-bold text-lg tracking-tight text-[#14303a]">BrioCare</span>
        </div>
        <div className="mx-auto"><PatientTabs variant="top" /></div>
        {home && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#52655f]">{home.name}</span>
            <span className="grid place-items-center w-8 h-8 rounded-full text-white text-sm font-bold" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)", color: "#06222b" }}>{home.initial}</span>
          </div>
        )}
      </header>

      <main className="pb-24 md:pb-10">{children}</main>

      {/* Bottom tabs (mobile) */}
      <PatientTabs variant="bottom" />
    </div>
  );
}
