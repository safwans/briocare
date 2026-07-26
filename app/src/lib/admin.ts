import { cache } from "react";
import { prisma } from "./db";

/**
 * Gate for the destructive test-data tools in admin-actions.ts (reset / seed / generate).
 *
 * `resetAllAction()` deletes every row in every table, and the app has no per-user authorization —
 * the shared demo password in src/lib/auth.ts is the only thing in front of it. So these stay off
 * outside dev unless a deployment explicitly opts in with ENABLE_ADMIN_TOOLS=1. Same pattern as
 * simEnabled() in src/lib/sim.ts, and read per request so the flag can be flipped without a rebuild.
 */
export function adminToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_ADMIN_TOOLS === "1";
}

export const getAdminCounts = cache(async () => {
  const [therapists, cohorts, patients, sessions] = await Promise.all([
    prisma.clinician.count(),
    prisma.cohort.count(),
    prisma.patient.count(),
    prisma.session.count(),
  ]);
  return { therapists, cohorts, patients, sessions };
});

export async function listTherapists() {
  const rows = await prisma.clinician.findMany({
    include: { user: true, cohorts: true },
    orderBy: { user: { displayName: "asc" } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.user.displayName,
    email: c.user.email,
    credential: c.credential,
    cohorts: c.cohorts.length,
  }));
}

export async function listCohorts() {
  const rows = await prisma.cohort.findMany({
    include: {
      _count: { select: { enrollments: true, sessions: true } },
      clinicians: { include: { clinician: { include: { user: true } } } },
    },
    orderBy: { code: "asc" },
  });
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    focus: c.focus,
    meetsOn: c.meetsOn,
    meetsAt: c.meetsAt,
    facilitator: c.clinicians[0]?.clinician.user.displayName ?? "—",
    members: c._count.enrollments,
    sessions: c._count.sessions,
    status: c.status,
  }));
}

export async function listPatients() {
  const rows = await prisma.patient.findMany({
    include: { enrollments: { include: { cohort: true } } },
    orderBy: [{ firstName: "asc" }],
  });
  return rows.map((p) => {
    const active = p.enrollments.find((e) => e.status === "ACTIVE");
    const age = 2026 - p.dob.getUTCFullYear();
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      age,
      cohort: active ? active.cohort.code : "Unassigned",
    };
  });
}

export async function listSessions() {
  const rows = await prisma.session.findMany({
    include: { cohort: true, _count: { select: { attendance: true } } },
    orderBy: [{ cohort: { code: "asc" } }, { index: "asc" }],
  });
  return rows.map((s) => ({
    id: s.id,
    cohort: s.cohort.code,
    index: s.index,
    module: s.module,
    status: s.status,
    present: s._count.attendance,
  }));
}
