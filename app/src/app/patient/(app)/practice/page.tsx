import { getPatientHome } from "@/lib/patient";

export default async function PracticePage() {
  const home = await getPatientHome();
  const therapist = home?.therapist ?? "your therapist";
  const module = home?.module || "catching a thought and checking if it's really true";

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-5 md:px-6 py-6 text-[#243b34]">
      <div className="text-sm text-[#7c8f89] mb-1">Between sessions</div>
      <div className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Keep it going</div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Try before Thursday */}
        <div className="rounded-3xl p-6 text-white md:col-span-2" style={{ background: "linear-gradient(160deg,#1b4d58,#0f333b)" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#7fd0dc" }}>Try before Thursday</div>
          <div className="text-xl font-bold leading-snug mb-2">Notice one worried thought this week</div>
          <p className="text-sm leading-relaxed text-[#cfe9ee]">
            When you catch yourself worrying, pause and ask: <span className="italic">&ldquo;What&apos;s the evidence this is true?&rdquo;</span> That&apos;s the skill we&apos;re practicing — {module.toLowerCase()}.
          </p>
        </div>

        {/* Your wins */}
        <div className="rounded-3xl p-5 bg-white border border-[#ece3d6]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#1c7b8c] mb-3">Your wins</div>
          <ul className="space-y-3">
            {["You showed up to every session this month", "You shared with the group last week", "You tried the breathing exercise"].map((w) => (
              <li key={w} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid place-items-center w-5 h-5 rounded-full text-white text-xs shrink-0" style={{ background: "#3f9a7d" }}>✓</span>
                <span className="text-[#3a4d47]">{w}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Note from therapist */}
        <div className="rounded-3xl p-5" style={{ background: "#fdeee4", border: "1px solid #f6d9c8" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#c96b45" }}>A note from {therapist}</div>
          <p className="text-[15px] leading-relaxed text-[#5c4a41]">
            &ldquo;You&apos;ve been showing up even on the hard days. That takes real courage. Keep noticing those thoughts — you&apos;re getting better at it.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
