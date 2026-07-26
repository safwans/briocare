import { cache } from "react";
import { prisma } from "./db";
import { simPatientId } from "./sim";

// Patient-facing data. No auth in MVP — resolves a demo patient (a member of a cohort with a live
// session, else the first enrolled patient). ?p=<patientId> overrides.
export type PatientHome = {
  patientId: string;
  name: string;
  initial: string;
  cohortName: string;
  therapist: string;
  sessionState: "live" | "upcoming" | "none";
  sessionId: string | null;
  module: string;
  weeks: number;
};

export type GroupMember = { patientId: string; name: string; initials: string };
export type PatientGroup = {
  patientId: string;
  patientName: string;
  groupLabel: string;
  therapistName: string;
  therapistInitials: string;
  sessionId: string | null;
  live: boolean;
  roster: GroupMember[];
};

function initialsOf(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export const getPatientGroup = cache(async (patientId?: string): Promise<PatientGroup | null> => {
  const pid = patientId ?? (await simPatientId());
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE" },
    include: {
      patient: true,
      cohort: {
        include: {
          sessions: { orderBy: { index: "asc" } },
          enrollments: { where: { status: "ACTIVE" }, include: { patient: true } },
          clinicians: { include: { clinician: { include: { user: true } } } },
        },
      },
    },
  });
  if (enrollments.length === 0) return null;

  const chosen =
    (pid && enrollments.find((e) => e.patientId === pid)) ||
    enrollments.find((e) => e.cohort.sessions.some((s) => s.status === "LIVE")) ||
    enrollments[0];

  const sessions = chosen.cohort.sessions;
  const live = sessions.find((s) => s.status === "LIVE");
  const upcoming = sessions.find((s) => s.status === "SCHEDULED");
  const therapistUser = chosen.cohort.clinicians[0]?.clinician.user;
  const therapistName = therapistUser?.displayName ?? "Dr. Cho";
  const tParts = therapistName.split(" ").filter((w) => w && !w.endsWith("."));
  const therapistInitials = (tParts.map((w) => w[0]).slice(0, 2).join("") || "DC").toUpperCase();

  const meets = chosen.cohort.meetsOn || "Group";
  const roster = chosen.cohort.enrollments.map((e) => ({
    patientId: e.patientId,
    name: e.patient.firstName,
    initials: initialsOf(e.patient.firstName, e.patient.lastName),
  }));

  return {
    patientId: chosen.patientId,
    patientName: chosen.patient.firstName,
    groupLabel: `${meets} Group`,
    therapistName,
    therapistInitials,
    sessionId: (live ?? upcoming ?? null)?.id ?? null,
    live: !!live,
    roster,
  };
});

export const getPatientHome = cache(async (patientId?: string): Promise<PatientHome | null> => {
  const pid = patientId ?? (await simPatientId());
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE" },
    include: { patient: true, cohort: { include: { sessions: { orderBy: { index: "asc" } }, clinicians: { include: { clinician: { include: { user: true } } } } } } },
  });
  if (enrollments.length === 0) return null;

  const chosen =
    (pid && enrollments.find((e) => e.patientId === pid)) ||
    enrollments.find((e) => e.cohort.sessions.some((s) => s.status === "LIVE")) ||
    enrollments[0];

  const sessions = chosen.cohort.sessions;
  const live = sessions.find((s) => s.status === "LIVE");
  const upcoming = sessions.find((s) => s.status === "SCHEDULED");
  const current = live ?? upcoming ?? [...sessions].reverse().find((s) => s.status === "READY") ?? sessions[sessions.length - 1];
  const therapist = chosen.cohort.clinicians[0]?.clinician.user.displayName ?? "your therapist";

  return {
    patientId: chosen.patientId,
    name: chosen.patient.firstName,
    initial: chosen.patient.firstName[0] ?? "?",
    cohortName: chosen.cohort.name,
    therapist,
    sessionState: live ? "live" : upcoming ? "upcoming" : "none",
    sessionId: (live ?? upcoming ?? current)?.id ?? null,
    module: current?.module ?? "",
    weeks: current?.index ?? sessions.length,
  };
});
