import Link from "next/link";
import { getPatientHome } from "@/lib/patient";

export default async function PatientHome() {
  const home = await getPatientHome();
  if (!home) return <div className="text-[#7c8f89]">No enrollment found.</div>;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const live = home.sessionState === "live";
  const joinHref = "/patient/group";

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-5 md:px-6 py-6 text-[#243b34]">
      {/* Greeting */}
      <div className="flex items-center justify-between mb-6 md:hidden">
        <div>
          <div className="text-sm text-[#7c8f89]">{today}</div>
          <div className="text-2xl font-bold tracking-tight">Hi, {home.name}</div>
        </div>
        <span className="grid place-items-center w-11 h-11 rounded-full text-lg font-bold" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)", color: "#06222b" }}>{home.initial}</span>
      </div>
      <div className="hidden md:block mb-6">
        <div className="text-sm text-[#7c8f89]">{today}</div>
        <div className="text-3xl font-bold tracking-tight">Hi, {home.name}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Join card */}
        <div className="rounded-3xl p-6 text-white md:row-span-2 flex flex-col justify-between" style={{ background: "linear-gradient(160deg,#1b4d58,#0f333b)" }}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: live ? "#ef7d5a" : "#7fd0dc" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: live ? "#f6a97f" : "#7fd0dc" }}>
                {live ? "Live now" : home.sessionState === "upcoming" ? "Starting soon" : "Next up"}
              </span>
            </div>
            <div className="text-2xl font-bold leading-tight mb-1">{live ? "Your group is live" : "Your group is starting"}</div>
            <div className="text-sm text-[#cfe9ee]">{home.cohortName.replace(" PM", "").replace(" AM", "")} · with {home.therapist}</div>
          </div>
          <Link href={joinHref} className="mt-6 inline-block text-center rounded-2xl px-6 py-3.5 font-bold" style={{ background: "#ef7d5a", color: "#fff" }}>
            Join group
          </Link>
        </div>

        {/* Check-in nudge */}
        <Link href="/patient/checkin" className="rounded-3xl p-5 bg-white border border-[#ece3d6] flex items-center gap-4">
          <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={{ background: "#fdeee4" }}>
            <span className="w-4 h-4 rounded-full" style={{ background: "linear-gradient(150deg,#f6a97f,#ef7d5a)" }} />
          </span>
          <div className="flex-1">
            <div className="font-bold">Quick check-in</div>
            <div className="text-sm text-[#7c8f89]">Take 20 seconds before group</div>
          </div>
          <span className="text-[#c3b7a4] text-xl">›</span>
        </Link>

        {/* Weeks with group */}
        <div className="rounded-3xl p-5 flex items-center gap-4 text-[#eaf6f7]" style={{ background: "linear-gradient(150deg,#20515c,#133e47)" }}>
          <div className="text-4xl font-bold" style={{ color: "#7fd0dc" }}>{home.weeks}</div>
          <div>
            <div className="font-bold text-white">weeks with your group</div>
            <div className="text-sm" style={{ color: "#a9d2d8" }}>Showing up is the hard part. You&apos;ve got this.</div>
          </div>
        </div>
      </div>

      {/* This week */}
      <div className="rounded-3xl p-5 bg-white border border-[#ece3d6] mt-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#1c7b8c] mb-2">This week we&apos;re practicing</div>
        <div className="text-lg font-bold leading-snug mb-1">{home.module || "Catching a thought and checking if it's really true"}</div>
        <p className="text-sm leading-relaxed text-[#52655f]">We&apos;ll try it together in group. No pressure — you can share as much or as little as you want.</p>
      </div>
    </div>
  );
}
