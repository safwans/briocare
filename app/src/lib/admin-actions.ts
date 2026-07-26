"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { resetAll, seedDemoData, genTherapist, genLoosePatients, genRandomCohort, deleteCohort, deletePatient, deleteTherapist } from "./seed-core";
import { setDirectorModel } from "./settings";
import { adminToolsEnabled } from "./admin";

/**
 * Server-side gate on every data-mutating tool below — defense in depth, exactly like the safety
 * check in approveNote(). Hiding a button is not a control: these are Server Actions, reachable by
 * a crafted POST from anyone who can load the page.
 */
function assertAdminTools() {
  if (!adminToolsEnabled()) {
    throw new Error(
      "Admin test-data tools are disabled in this environment. Set ENABLE_ADMIN_TOOLS=1 to enable them."
    );
  }
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/therapists");
  revalidatePath("/admin/cohorts");
  revalidatePath("/admin/patients");
  revalidatePath("/admin/sessions");
}

export async function seedDemoAction() {
  assertAdminTools();
  await resetAll(prisma);
  await seedDemoData(prisma);
  revalidateAdmin();
}

export async function resetAllAction() {
  assertAdminTools();
  await resetAll(prisma);
  revalidateAdmin();
}

export async function genCohortAction(formData: FormData) {
  assertAdminTools();
  const name = String(formData.get("name") ?? "");
  const patients = Number(formData.get("patients") ?? 6);
  const sessions = Number(formData.get("sessions") ?? 6);
  const rawPre = formData.get("preGenerated");
  const preGenerated = rawPre === null || rawPre === "" ? undefined : Number(rawPre);
  const clinicianId = String(formData.get("clinicianId") ?? "") || undefined;
  const meetsOn = String(formData.get("meetsOn") ?? "") || undefined;
  const meetsAt = String(formData.get("meetsAt") ?? "") || undefined;
  const focus = String(formData.get("focus") ?? "") || undefined;
  await genRandomCohort(prisma, { name, patients, sessions, preGenerated, clinicianId, meetsOn, meetsAt, focus });
  revalidateAdmin();
}

export async function genTherapistAction() {
  assertAdminTools();
  await genTherapist(prisma);
  revalidateAdmin();
}

export async function genLoosePatientsAction(count = 5) {
  assertAdminTools();
  // Clamped: this is a demo-data tool, not a bulk importer.
  await genLoosePatients(prisma, Math.max(1, Math.min(20, Math.floor(count) || 5)));
  revalidateAdmin();
}

export async function deleteCohortAction(cohortId: string) {
  assertAdminTools();
  await deleteCohort(prisma, cohortId);
  revalidateAdmin();
  // The therapist surface reads the same cohorts; without this its nav keeps a dead link.
  revalidatePath("/therapist", "layout");
}

export async function deletePatientAction(patientId: string) {
  assertAdminTools();
  await deletePatient(prisma, patientId);
  revalidateAdmin();
  revalidatePath("/therapist", "layout");
}

export async function deleteTherapistAction(clinicianId: string) {
  assertAdminTools();
  await deleteTherapist(prisma, clinicianId);
  revalidateAdmin();
}

/** Choose which Anthropic model the AI-patient turn director runs on. Applies to everyone. */
export async function setDirectorModelAction(formData: FormData) {
  await setDirectorModel(String(formData.get("model")));
  revalidateAdmin();
}
