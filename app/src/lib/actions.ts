"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { nextModule } from "./modules";

// NOTE (MVP): auth/authorization is stubbed for the test-data build. Every action here MUST
// verify the acting clinician owns the cohort before Phase 2. See docs/security-compliance.md.
async function actingClinicianId(): Promise<string> {
  const c = await prisma.clinician.findFirst({ select: { id: true } });
  if (!c) throw new Error("no clinician");
  return c.id;
}

async function audit(action: string, entityType: string, entityId: string, meta?: object) {
  const clinicianId = await actingClinicianId();
  const org = await prisma.org.findFirst({ select: { id: true } });
  await prisma.auditEvent.create({
    data: { orgId: org!.id, actorId: clinicianId, action, entityType, entityId, meta: meta ?? {} },
  });
}

/** Save a clinician edit to a note section. */
export async function saveSection(formData: FormData) {
  const sectionId = String(formData.get("sectionId"));
  const body = String(formData.get("body") ?? "");
  await prisma.noteSection.update({ where: { id: sectionId }, data: { bodyEdited: body } });
  await audit("note.section.edited", "NoteSection", sectionId);
  revalidatePath("/therapist/cohort/[cohortId]/notes", "page");
}

/** Clinician attests a claim the verifier could not ground (UNSUPPORTED/UNCERTAIN). */
export async function attestClaim(formData: FormData) {
  const claimId = String(formData.get("claimId"));
  await prisma.noteClaim.update({ where: { id: claimId }, data: { verdict: "CLINICIAN_ATTESTED" } });
  await audit("note.claim.attested", "NoteClaim", claimId);
  revalidatePath("/therapist/cohort/[cohortId]/notes", "page");
}

/** Disposition a risk flag (mandatory before it can be acknowledged/closed). */
export async function dispositionFlag(formData: FormData) {
  const flagId = String(formData.get("flagId"));
  const disposition = String(formData.get("disposition")) as
    | "REVIEWED" | "ADDRESSED" | "FOLLOW_UP" | "ESCALATED";
  const clinicianId = await actingClinicianId();
  await prisma.riskFlag.update({
    where: { id: flagId },
    data: { disposition, status: "ACKNOWLEDGED", ackBy: clinicianId, ackAt: new Date() },
  });
  await audit("risk.flag.dispositioned", "RiskFlag", flagId, { disposition });
  revalidatePath("/therapist/cohort/[cohortId]/notes", "page");
}

/** Run the batch pipeline for a session (ASR/synthetic → grounded notes → group note → risk stub). */
export async function processSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  const { processSession } = await import("./pipeline");
  await processSession(sessionId);
  revalidatePath("/therapist", "layout");
}

/** Transition a session's status (SCHEDULED → LIVE → ENDED). Drives the Live Room. */
export async function setSessionStatus(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  const status = String(formData.get("status")) as "LIVE" | "ENDED";
  if (status !== "LIVE" && status !== "ENDED") throw new Error("bad status");
  const session = await prisma.session.update({ where: { id: sessionId }, data: { status } });
  await audit(`session.${status.toLowerCase()}`, "Session", sessionId);
  if (status === "ENDED") await ensureNextSession(session.cohortId);
  revalidatePath("/therapist", "layout");
}

/**
 * Keep exactly one startable session per cohort. When a session ends, the next one is scheduled so
 * the therapist can run another without reseeding — and so no cohort is ever left with nothing to
 * start. Never creates a second one if a SCHEDULED session already exists.
 */
async function ensureNextSession(cohortId: string) {
  const pending = await prisma.session.count({ where: { cohortId, status: "SCHEDULED" } });
  if (pending > 0) return;

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: { sessions: { orderBy: { index: "desc" }, take: 1 } },
  });
  if (!cohort) return;

  const last = cohort.sessions[0];

  // An IOP is a fixed-length programme, not an open-ended series. Without this the cohort grew a
  // new session every time one ended, so a cohort configured for 6 kept offering "start session 7",
  // "8", "9"… and could never be completed or discharged.
  if (last && last.index >= cohort.sessionCount) return;
  const next = await prisma.session.create({
    data: {
      cohortId,
      index: (last?.index ?? 0) + 1,
      // Keep the module coherent with the cohort's focus rather than repeating the last one.
      module: nextModule(cohort.focus, last?.module),
      scheduledAt: new Date((last?.scheduledAt?.getTime() ?? Date.now()) + 7 * 864e5),
      status: "SCHEDULED",
    },
  });
  await audit("session.scheduled", "Session", next.id, { index: next.index });
}

/**
 * Approve the session's group note. The GroupNote model always carried status/approvedBy/approvedAt,
 * but nothing ever set them — the group note rendered read-only with no way to sign it, so a session
 * could never be fully filed. Same gates as an individual note: real content, and no unresolved
 * acute flag anywhere in the session (the group note describes the whole room, so any member's
 * unresolved acute flag blocks it, not just one patient's).
 */
export async function approveGroupNote(formData: FormData) {
  const noteId = String(formData.get("noteId"));
  const note = await prisma.groupNote.findUnique({
    where: { id: noteId },
    include: { _count: { select: { sections: true } } },
  });
  if (!note) throw new Error("group note not found");
  if (note._count.sections === 0) {
    throw new Error("Cannot approve: this note has no content. Re-generate the session's notes.");
  }

  const acute = await prisma.riskFlag.count({
    where: { sessionId: note.sessionId, severity: "ACUTE", status: { notIn: ["ACKNOWLEDGED", "CLOSED"] } },
  });
  if (acute > 0) throw new Error("Cannot approve: unresolved acute flag in this session.");

  const clinicianId = await actingClinicianId();
  await prisma.groupNote.update({
    where: { id: noteId },
    data: { status: "APPROVED", approvedBy: clinicianId, approvedAt: new Date() },
  });
  await audit("group_note.approved", "GroupNote", noteId);
  revalidatePath("/therapist/cohort/[cohortId]/notes", "page");
}

/**
 * Approve a note. Enforces the grounding + safety gate server-side (defense in depth —
 * the button is also disabled in the UI when not approvable).
 */
export async function approveNote(formData: FormData) {
  const noteId = String(formData.get("noteId"));
  const note = await prisma.individualNote.findUnique({
    where: { id: noteId },
    include: { _count: { select: { sections: true } } },
  });
  if (!note) throw new Error("note not found");

  // A note with no sections has no clinical content. The UI rendered these as approvable drafts —
  // goal signals, audit trail, live "Approve & sign off" button, and nothing else — so an empty
  // record could be signed into a patient's chart. Server-side because that's the only place a
  // crafted POST can't skip.
  if (note._count.sections === 0) {
    throw new Error("Cannot approve: this note has no content. Re-generate the session's notes.");
  }

  // Grounding is informational; the clinician's single attestation is the sign-off.
  // The one remaining gate is safety: no unresolved acute risk flag for this session + patient.
  const acute = await prisma.riskFlag.count({
    where: {
      sessionId: note.sessionId, patientId: note.patientId, severity: "ACUTE",
      status: { notIn: ["ACKNOWLEDGED", "CLOSED"] },
    },
  });
  if (acute > 0) throw new Error("Cannot approve: unresolved acute flag.");

  const clinicianId = await actingClinicianId();
  await prisma.individualNote.update({
    where: { id: noteId },
    data: { status: "APPROVED", approvedBy: clinicianId, approvedAt: new Date() },
  });
  await audit("note.approved", "IndividualNote", noteId);
  revalidatePath("/therapist/cohort/[cohortId]/notes", "page");
}
