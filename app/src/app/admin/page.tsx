import { getAdminCounts, listTherapists } from "@/lib/admin";
import { CohortGenerator, QuickAddButtons, DirectorModelPicker } from "@/components/AdminActions";
import { getDirectorModel } from "@/lib/settings";
import { DIRECTOR_MODELS } from "@/lib/director-models";

export default async function AdminOverview() {
  const [counts, therapists, directorModel] = await Promise.all([
    getAdminCounts(),
    listTherapists(),
    getDirectorModel(),
  ]);
  const cards = [
    { n: counts.therapists, label: "Therapists" },
    { n: counts.cohorts, label: "Cohorts" },
    { n: counts.patients, label: "Patients" },
    { n: counts.sessions, label: "Sessions" },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-[25px] font-bold tracking-tight text-[#14303a]">Overview</h1>
      <p className="text-[14.5px] text-[#5f727a] mt-1 mb-6">
        Spin up realistic BrioCare data with one click — no manual entry. Generate a full cohort
        (therapist + patients + a session schedule) at once, or seed an entire demo org.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[13px] bg-white border border-[#e2e8ea] px-4 py-4">
            <div className="font-bold text-[26px] text-[#135463] leading-none">{c.n}</div>
            <div className="text-[13px] text-[#5f727a] mt-1.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[15px] bg-[#eef4f3] border border-[#dfe8e6] p-6 mb-4">
        <div className="font-bold text-[18px] text-[#14303a] mb-1">Quick-create a cohort</div>
        <p className="text-[13.5px] text-[#5f727a] mb-5">
          Generates the cohort, assigns a facilitator, enrolls patients, and lays out a weekly session
          schedule — in one step.
        </p>
        <CohortGenerator therapists={therapists} />
      </div>

      <QuickAddButtons />

      <div className="rounded-[15px] bg-white border border-[#e2e8ea] p-6 mt-8">
        <div className="font-bold text-[18px] text-[#14303a] mb-1">AI patient director</div>
        <p className="text-[13.5px] text-[#5f727a] mb-5">
          Which Anthropic model decides who speaks and what they say when you simulate patients in a
          live session. Applies to everyone. Note generation is unaffected — that runs on its own model.
        </p>
        <DirectorModelPicker models={DIRECTOR_MODELS} current={directorModel} />
      </div>
    </div>
  );
}
