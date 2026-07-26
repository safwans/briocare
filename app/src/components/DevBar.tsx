import { prisma } from "@/lib/db";
import { simClinicianId, simPatientId } from "@/lib/sim";
import DevBarClient from "./DevBarClient";

// Dev-only simulation toolbar. Rendered globally in development so you can jump between
// Admin / Therapist / Patient and pick which therapist or patient to simulate.
export default async function DevBar() {
  const [clinicians, patients, curClin, curPat] = await Promise.all([
    prisma.clinician.findMany({ include: { user: true }, orderBy: { user: { displayName: "asc" } } }),
    prisma.patient.findMany({
      include: { enrollments: { where: { status: "ACTIVE" }, include: { cohort: true } } },
      orderBy: [{ firstName: "asc" }],
    }),
    simClinicianId(),
    simPatientId(),
  ]);

  const therapists = clinicians.map((c) => ({ id: c.id, name: c.user.displayName }));
  const pats = patients.map((p) => {
    const c = p.enrollments[0]?.cohort;
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      cohort: c ? `${c.code} · ${c.meetsOn}s ${c.meetsAt}` : "Unassigned",
    };
  });

  return <DevBarClient therapists={therapists} patients={pats} curClinician={curClin ?? null} curPatient={curPat ?? null} />;
}
