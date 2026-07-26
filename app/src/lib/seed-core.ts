// Shared seeding/generation logic. Used by prisma/seed.ts (full demo) and the admin console
// server actions (generate cohort / therapist / patients on demand). All TEST data.
import { MODULES_BY_FOCUS } from "./modules";
import type { PrismaClient } from "../generated/prisma/client";

const TEMPLATE_VER = "note-v0";

export type Status =
  | "ESTABLISHING" | "CHECK_IN" | "WORTH_A_LOOK" | "WATCH" | "STABLE" | "IMPROVING" | "ABSENT";

function baselineOf(trend: number[]): number {
  const first3 = trend.slice(0, 3);
  return first3.reduce((a, b) => a + b, 0) / first3.length;
}
export function statusAt(trend: number[], i: number, absent = false): Status {
  // Absence is its own status, not a low score. Seeded absences used to come out as CHECK_IN,
  // so the roster chipped a member who simply wasn't there as one who needs a check-in —
  // exactly the conflation recomputeEngagement() avoids for real sessions.
  if (absent) return "ABSENT";
  if (i < 2) return "ESTABLISHING";
  const base = baselineOf(trend);
  const delta = (trend[i] - base) / base;
  const deltaPrev = (trend[i - 1] - base) / base;
  if ((delta <= -0.5 && deltaPrev <= -0.5) || (delta <= -0.35 && absent)) return "CHECK_IN";
  if (delta <= -0.25) return "WATCH";
  const rising = trend[i] > trend[i - 1] && trend[i - 1] >= trend[i - 2];
  if (rising && delta >= 0.15) return "IMPROVING";
  return "STABLE";
}
function signalsFromPI(pi: number, absent = false) {
  if (absent) return { talkS: 0, turns: 0, cameraOnPct: 0, presencePct: 0, chatCount: 0 };
  return {
    talkS: Math.round((pi / 100) * 480),
    turns: Math.max(0, Math.round(pi / 10)),
    cameraOnPct: Math.min(100, Math.round(pi * 1.6)),
    presencePct: Math.min(100, 60 + Math.round(pi / 3)),
    chatCount: Math.round(pi / 20),
  };
}

export type MemberSpec = {
  first: string; last: string; age: number; trend: number[];
  absentLast?: boolean; goals: [string, string];
  existingPatientId?: string; // reuse an unassigned patient instead of creating a new one
};

type Focus = "SOCIAL_ANXIETY" | "MOOD_DEPRESSION" | "EMOTION_REGULATION";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Date of session 1 for a cohort that meets weekly on `meetsOn` at `meetsAt`.
 *
 * Two things were wrong with the fixed `2026-06-01` anchor this replaces. It went stale — every
 * seeded cohort eventually showed "Scheduled for Jun 15" long after that date had passed, so the
 * one session left to run advertised itself as overdue. And it ignored `meetsOn` entirely: a
 * cohort labelled "Tuesdays 4:00 PM" had its sessions stamped on a Monday.
 *
 * Anchored so the FIRST UNPLAYED session lands on the next upcoming `meetsOn`, which puts the
 * played history on the weeks immediately before it.
 */
function weeklyAnchor(meetsOn: string, meetsAt: string, sessionsPlayed: number): Date {
  const target = Math.max(0, WEEKDAYS.indexOf(meetsOn));
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(meetsAt.trim());
  let hour = m ? Number(m[1]) % 12 : 16;
  if (m && /pm/i.test(m[3])) hour += 12;
  const minute = m ? Number(m[2]) : 0;

  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  // Strictly forward: if today is the meeting day and the slot has passed, go to next week.
  let delta = (target - next.getDay() + 7) % 7;
  if (delta === 0 && next.getTime() <= Date.now()) delta = 7;
  next.setDate(next.getDate() + delta);

  // Walk back one week per already-played session to get session 1's date.
  const first = new Date(next);
  first.setDate(first.getDate() - sessionsPlayed * 7);
  return first;
}

export async function seedCohort(prisma: PrismaClient, opts: {
  orgId: string; clinicianId: string;
  name: string; focus: Focus;
  meetsOn: string; meetsAt?: string; ageLow: number; ageHigh: number; sessionCount: number;
  /** How many of those sessions are pre-generated as completed history. Rest stay unrun. */
  sessionsPlayed?: number;
  /**
   * How the pre-generated sessions' notes are left. "allButLatest" keeps the newest one in DRAFT
   * so the canonical demo seed opens with something waiting in Note review. "all" files every one
   * of them, which is what pre-generated history should look like — a completed session with
   * unapproved notes reads as work the therapist forgot to do, not as history.
   */
  notes?: "all" | "allButLatest";
  module: string; members: MemberSpec[];
}) {
  // Explicit, not inferred. This used to read the trend array's length, which silently coupled
  // "how many sessions have happened" to "how many trend points a member has" — and always
  // produced one MORE session than asked for, because a SCHEDULED one is appended below.
  const sessionsPlayed = Math.min(opts.sessionsPlayed ?? opts.members[0].trend.length, opts.sessionCount);
  // Next unused number, not count()+1: deleting a cohort in admin and adding another handed out a
  // code already in use, so the sidebar listed two "C-03"s with no way to tell them apart. Codes
  // are the cohort's identity in every title, so they have to stay distinct within an org.
  const existing = await prisma.cohort.findMany({ where: { orgId: opts.orgId }, select: { code: true } });
  const highest = existing.reduce((max, c) => {
    const n = /^C-(\d+)$/.exec(c.code)?.[1];
    return n ? Math.max(max, Number(n)) : max;
  }, 0);
  const code = `C-${String(highest + 1).padStart(2, "0")}`;
  const cohort = await prisma.cohort.create({
    data: {
      orgId: opts.orgId, code, name: opts.name, focus: opts.focus, meetsOn: opts.meetsOn,
      meetsAt: opts.meetsAt ?? "4:00 PM",
      ageBandLow: opts.ageLow, ageBandHigh: opts.ageHigh, sessionCount: opts.sessionCount,
      status: "ACTIVE",
      clinicians: { create: { clinicianId: opts.clinicianId } },
    },
  });

  // Sessions that already happened are ENDED: the room closed, no notes generated yet. Notes only
  // ever come from a session someone actually ran. Nothing is seeded LIVE — a seeded LIVE session
  // hijacks every "live room" link in the app (queries.ts resolves them to whichever session is
  // LIVE), so the room is only ever entered by pressing "Start session room".
  const baseDate = weeklyAnchor(opts.meetsOn, opts.meetsAt ?? "4:00 PM", sessionsPlayed);
  const sessions = [];
  for (let s = 1; s <= sessionsPlayed; s++) {
    sessions.push(await prisma.session.create({
      data: {
        cohortId: cohort.id, index: s, module: opts.module,
        scheduledAt: new Date(baseDate.getTime() + (s - 1) * 7 * 864e5),
        status: "ENDED",
      },
    }));
  }
  // One upcoming session so the cohort has something to start — unless the configured programme
  // is already fully played, in which case the cohort is complete and gets no session 7-of-6.
  if (sessionsPlayed < opts.sessionCount) await prisma.session.create({
    data: {
      cohortId: cohort.id, index: sessionsPlayed + 1, module: opts.module,
      scheduledAt: new Date(baseDate.getTime() + sessionsPlayed * 7 * 864e5),
      status: "SCHEDULED",
    },
  });

  const summary: { patientId: string; first: string; last: string; latest: Status; trend: number[] }[] = [];

  for (const m of opts.members) {
    const patient = m.existingPatientId
      ? (await prisma.patient.findUnique({ where: { id: m.existingPatientId } }))!
      : await prisma.patient.create({
          data: {
            orgId: opts.orgId, firstName: m.first, lastName: m.last,
            dob: new Date(`${2026 - m.age}-03-15T00:00:00Z`),
          },
        });
    const enrollment = await prisma.enrollment.create({
      data: {
        cohortId: cohort.id, patientId: patient.id, status: "ACTIVE",
        goals: {
          create: [
            { text: m.goals[0], order: 0, status: "ON_TRACK" },
            { text: m.goals[1], order: 1, status: "EMERGING" },
          ],
        },
      },
    });
    for (let j = 0; j < m.trend.length; j++) {
      const absent = !!m.absentLast && j === m.trend.length - 1;
      const sig = signalsFromPI(m.trend[j], absent);
      const st = statusAt(m.trend, j, absent);
      await prisma.attendance.create({
        data: { sessionId: sessions[j].id, patientId: patient.id, present: !absent },
      });
      await prisma.engagementMetric.create({
        data: {
          sessionId: sessions[j].id, patientId: patient.id,
          ...sig, participationIndex: m.trend[j], status: st,
        },
      });
    }
    const base = baselineOf(m.trend);
    await prisma.baseline.create({
      data: { enrollmentId: enrollment.id, participationIndex: base, sessionsSeen: m.trend.length },
    });
    const latest = statusAt(m.trend, m.trend.length - 1, m.absentLast);
    summary.push({ patientId: patient.id, first: m.first, last: m.last, latest, trend: m.trend });
  }

  // Notes for every completed (ENDED) session.
  const draftIndex = opts.notes === "all" ? -1 : sessions.length ? sessions[sessions.length - 1].index : 0;
  for (const s of sessions) {
    const membersUpTo = summary.map((m) => ({ patientId: m.patientId, first: m.first, trend: m.trend.slice(0, s.index) }));
    await seedDraftNotesForSession(prisma, s, membersUpTo, {
      approved: s.index !== draftIndex,
      approvedBy: opts.clinicianId,
    });
  }

  return { cohort, sessions, summary };
}

// Synthetic-but-grounded notes for one session — mirrors the engagement seeding so Note review has a
// reviewable back-catalog. `approved` files the notes (older sessions); otherwise they're drafts.
export async function seedDraftNotesForSession(
  prisma: PrismaClient,
  session: { id: string; index: number; module: string },
  members: { patientId: string; first: string; trend: number[] }[],
  opts: { approved?: boolean; approvedBy?: string } = {},
) {
  const status = opts.approved ? "APPROVED" : "DRAFT";
  const approvedAt = opts.approved ? new Date() : null;
  // An APPROVED note with no signer is a contradiction — approveNote() always records who signed,
  // so seeded history has to as well or the audit story doesn't hold up.
  const approvedBy = opts.approved ? opts.approvedBy ?? null : null;
  for (const m of members) {
    const head = m.trend.slice(0, 3);
    const base = head.length ? head.reduce((x, y) => x + y, 0) / head.length : 1;
    const cur = m.trend[m.trend.length - 1] ?? 0;
    const pct = base ? Math.round(((cur - base) / base) * 100) : 0;
    const dir = pct < 0 ? `${Math.abs(pct)}% below` : `${pct}% above`;
    const tk = `t_${m.first.toLowerCase()}_s${session.index}`;
    await prisma.individualNote.create({
      data: {
        sessionId: session.id, patientId: m.patientId, status, approvedAt, approvedBy, templateVer: TEMPLATE_VER,
        goalSignals: [
          { goal: "Group engagement", status: pct < 0 ? "DECLINING" : "ON_TRACK" },
          { goal: "Skill practice", status: "EMERGING" },
        ],
        sections: {
          create: [
            { key: "PRESENTATION_SUBJECTIVE", bodyDraft: `${m.first} presented and engaged in group.`,
              claims: { create: [{ text: `${m.first} attended and engaged.`, verdict: "SUPPORTED", evidence: [{ trackId: tk, startMs: 60000, endMs: 72000, quote: "Yeah, this week was okay." }] }] } },
            { key: "PARTICIPATION", bodyDraft: `Participation ${dir} own baseline (PI ${cur} vs ${Math.round(base)}).`,
              claims: { create: [{ text: `Participation ${dir} baseline.`, verdict: "SUPPORTED", evidence: [{ trackId: tk, startMs: 0, endMs: 0, quote: `[engagement: PI ${cur} vs baseline ${Math.round(base)}]` }] }] } },
            { key: "INTERVENTIONS_RESPONSE", bodyDraft: `Responded to the ${session.module.toLowerCase()} module.`,
              claims: { create: [{ text: `Engaged with the ${session.module.toLowerCase()} content.`, verdict: "SUPPORTED", evidence: [{ trackId: tk, startMs: 200000, endMs: 214000, quote: "I tried it once this week." }] }] } },
            { key: "PLAN", bodyDraft: `Continue current plan.`,
              claims: { create: [{ text: "Plan: continue current plan.", verdict: "CLINICIAN_ATTESTED", evidence: [] }] } },
          ],
        },
      },
    });
  }
  await prisma.groupNote.create({
    data: {
      sessionId: session.id, status, approvedAt, approvedBy, templateVer: TEMPLATE_VER,
      goalIndicators: [{ label: "Cohort cohesion", status: "ON_TRACK" }, { label: "Skill uptake", status: "EMERGING" }],
      sections: {
        create: [
          { key: "SESSION_OVERVIEW", bodyDraft: `Session ${session.index} focused on ${session.module.toLowerCase()}; ${members.length} present.` },
          { key: "GROUP_PROCESS_THEMES", bodyDraft: "Steady group cohesion; theme of school and social stress." },
          { key: "FACILITATOR_OBSERVATIONS", bodyDraft: "Most members trending around baseline; monitor any decliners." },
          { key: "PLAN", bodyDraft: "Continue module; targeted check-ins for at-baseline decliners." },
        ],
      },
    },
  });
}

const RESET_TABLES = [
  "AuditEvent", "ConsentRecord", "RiskFlag", "NoteClaim", "NoteSection", "GroupNote", "IndividualNote",
  "Baseline", "EngagementMetric", "EngagementEvent", "Transcript", "MediaTrack", "Attendance", "Session",
  "Goal", "Enrollment", "Guardian", "Patient", "CohortClinician", "Cohort", "Clinician", "User", "Org",
];

export async function resetAll(prisma: PrismaClient) {
  // Child-first DELETE respects FK constraints (all PKs are cuid strings, so no identity to reset).
  // Pool-safe: unlike SET FOREIGN_KEY_CHECKS, each statement is independent of connection/session.
  for (const t of RESET_TABLES) await prisma.$executeRawUnsafe(`DELETE FROM \`${t}\``);
}

// --- Full demo dataset (the three canonical cohorts; history only, no notes) ---
export async function seedDemoData(prisma: PrismaClient) {
  const org = await prisma.org.create({ data: { name: "BrioCare" } });
  const drCho = await prisma.user.create({
    data: {
      orgId: org.id, role: "THERAPIST", displayName: "Dr. Rachel Cho",
      email: "rachel.cho@briocare.test",
      clinician: { create: { credential: "LCSW", licensedStates: ["CA"] } },
    },
    include: { clinician: true },
  });
  const clinicianId = drCho.clinician!.id;

  await seedCohort(prisma, {
    orgId: org.id, clinicianId,
    name: "Tuesday PM · Social Anxiety", focus: "SOCIAL_ANXIETY", meetsOn: "Tuesday", meetsAt: "4:00 PM",
    ageLow: 14, ageHigh: 16, sessionCount: 8, module: "Cognitive restructuring",
    members: [
      { first: "Ari", last: "S.", age: 14, trend: [50, 48, 40, 30, 22, 15], goals: ["Tolerate speaking in group", "Sustain group attendance"] },
      { first: "Eli", last: "T.", age: 14, trend: [45, 30, 28, 18, 10, 6], absentLast: true, goals: ["Sustain attendance", "Re-engage in group"] },
      { first: "Grace", last: "L.", age: 14, trend: [38, 40, 42, 41, 44, 45], goals: ["Name cognitive distortions", "Apply a coping skill"] },
      { first: "Bea", last: "M.", age: 14, trend: [22, 28, 34, 40, 47, 53], goals: ["Initiate contribution unprompted", "Name cognitive distortions"] },
      { first: "Maya", last: "R.", age: 15, trend: [55, 54, 52, 50, 58, 60], goals: ["Support a peer in group", "Apply a coping skill in vivo"] },
      { first: "Devon", last: "P.", age: 16, trend: [48, 46, 44, 30, 28, 26], goals: ["Tolerate speaking in group", "Reduce avoidance"] },
      { first: "Sofia", last: "M.", age: 15, trend: [40, 42, 38, 36, 30, 28], goals: ["Share one thought per session", "Practice exposure"] },
      { first: "Jordan", last: "L.", age: 16, trend: [44, 45, 46, 45, 47, 48], goals: ["Maintain engagement", "Coach a peer"] },
    ],
  });

  await seedCohort(prisma, {
    orgId: org.id, clinicianId,
    name: "Thursday PM · Mood & Depression", focus: "MOOD_DEPRESSION", meetsOn: "Thursday", meetsAt: "5:30 PM",
    ageLow: 14, ageHigh: 17, sessionCount: 8, module: "Behavioral activation",
    members: [
      { first: "Noah", last: "B.", age: 15, trend: [40, 38, 30, 22, 16, 12], goals: ["Behavioral activation", "Track mood daily"] },
      { first: "Lucia", last: "P.", age: 16, trend: [35, 32, 28, 20, 14, 10], goals: ["Re-engage with activities", "Attend consistently"] },
      { first: "Marcus", last: "D.", age: 17, trend: [50, 51, 49, 52, 53, 55], goals: ["Maintain routine", "Support peers"] },
      { first: "Hana", last: "K.", age: 14, trend: [30, 34, 40, 45, 50, 54], goals: ["Increase activation", "Name emotions"] },
      { first: "Owen", last: "H.", age: 16, trend: [42, 43, 44, 43, 45, 46], goals: ["Sustain gains", "Practice skills"] },
      { first: "Zoe", last: "A.", age: 15, trend: [38, 39, 41, 40, 42, 43], goals: ["Behavioral activation", "Mood tracking"] },
      { first: "Liam", last: "O.", age: 17, trend: [46, 45, 47, 46, 48, 49], goals: ["Maintain engagement", "Coach a peer"] },
    ],
  });

  await seedCohort(prisma, {
    orgId: org.id, clinicianId,
    name: "Monday AM · Social Anxiety", focus: "SOCIAL_ANXIETY", meetsOn: "Monday", meetsAt: "10:00 AM",
    ageLow: 14, ageHigh: 15, sessionCount: 8, module: "Relapse prevention",
    members: [
      { first: "Amara", last: "T.", age: 14, trend: [40, 36, 30, 24, 18, 14], goals: ["Maintain gains", "Plan for setbacks"] },
      { first: "Caleb", last: "W.", age: 15, trend: [50, 52, 51, 53, 54, 56], goals: ["Relapse prevention", "Coach peers"] },
      { first: "Isabella", last: "F.", age: 14, trend: [44, 45, 46, 47, 48, 49], goals: ["Sustain skills", "Support peers"] },
      { first: "Ravi", last: "S.", age: 15, trend: [38, 40, 42, 41, 43, 44], goals: ["Maintain engagement", "Practice exposure"] },
      { first: "Priya", last: "K.", age: 14, trend: [42, 43, 41, 44, 45, 46], goals: ["Catch a thought and check if it's true", "Share in group"] },
      { first: "Tomás", last: "R.", age: 15, trend: [36, 38, 40, 39, 41, 42], goals: ["Sustain attendance", "Name distortions"] },
    ],
  });

  // No notes are seeded. A session that never ran has nothing to review — notes only exist for
  // sessions someone actually held and processed. Start the scheduled session to produce some.

  return org;
}

// --- Random generators for the admin "quick-create" tools ---
const FIRST = ["Aisha", "Ben", "Chloe", "Diego", "Emma", "Finn", "Gia", "Hugo", "Iris", "Jae", "Kira", "Leo", "Mira", "Nate", "Ona", "Pax", "Quinn", "Rex", "Sage", "Tara", "Uma", "Vik", "Wren", "Yara", "Zane"];
const LAST = ["A.", "B.", "C.", "D.", "F.", "G.", "H.", "K.", "L.", "M.", "N.", "P.", "R.", "S.", "T.", "V.", "W."];
const THERAPIST_FIRST = ["Alex", "Morgan", "Sam", "Taylor", "Jordan", "Casey", "Riley", "Jamie", "Avery", "Drew"];
const THERAPIST_LAST = ["Nguyen", "Patel", "Garcia", "Kim", "Rivera", "Okafor", "Brooks", "Mensah", "Silva", "Hughes"];
const CREDS = ["LCSW", "LMFT", "LPC", "PsyD", "PhD"];
// Keep the session module coherent with the program focus (avoids e.g. a Social-Anxiety cohort
const FOCI: Focus[] = ["SOCIAL_ANXIETY", "MOOD_DEPRESSION", "EMOTION_REGULATION"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randTrend(sessions: number): number[] {
  let v = 30 + Math.floor(Math.random() * 30);
  const drift = Math.random() < 0.5 ? -1 : 1;
  const out: number[] = [];
  for (let i = 0; i < sessions; i++) {
    v = Math.max(5, Math.min(95, v + drift * (Math.floor(Math.random() * 8)) + (Math.floor(Math.random() * 7) - 3)));
    out.push(v);
  }
  return out;
}

async function ensureOrg(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.org.findFirst();
  if (existing) return existing.id;
  const org = await prisma.org.create({ data: { name: "BrioCare" } });
  return org.id;
}

export async function genTherapist(prisma: PrismaClient) {
  const orgId = await ensureOrg(prisma);
  const first = pick(THERAPIST_FIRST);
  const last = pick(THERAPIST_LAST);
  await prisma.user.create({
    data: {
      orgId, role: "THERAPIST", displayName: `Dr. ${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${Math.floor(Math.random() * 1000)}@briocare.test`,
      clinician: { create: { credential: pick(CREDS), licensedStates: ["CA"] } },
    },
  });
}

export async function genLoosePatients(prisma: PrismaClient, count = 5) {
  const orgId = await ensureOrg(prisma);
  for (let i = 0; i < count; i++) {
    const age = 14 + Math.floor(Math.random() * 4);
    await prisma.patient.create({
      data: {
        orgId, firstName: pick(FIRST), lastName: pick(LAST),
        dob: new Date(`${2026 - age}-03-15T00:00:00Z`),
      },
    });
  }
}

export async function genRandomCohort(prisma: PrismaClient, opts: {
  name?: string; patients: number; sessions: number; preGenerated?: number;
  clinicianId?: string; meetsOn?: string; meetsAt?: string; focus?: string;
}) {
  const orgId = await ensureOrg(prisma);
  // use the chosen therapist, else find/create one
  let clinician =
    (opts.clinicianId ? await prisma.clinician.findUnique({ where: { id: opts.clinicianId } }) : null) ??
    (await prisma.clinician.findFirst());
  if (!clinician) {
    await genTherapist(prisma);
    clinician = await prisma.clinician.findFirst();
  }
  const focus = (opts.focus && (FOCI as string[]).includes(opts.focus) ? (opts.focus as Focus) : pick(FOCI));
  const meetsOn = opts.meetsOn?.trim() || pick(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const meetsAt = opts.meetsAt?.trim() || pick(["10:00 AM", "11:30 AM", "1:00 PM", "3:00 PM", "4:00 PM", "5:30 PM"]);
  const ampm = meetsAt.includes("AM") ? "AM" : "PM";
  const focusName = focus === "SOCIAL_ANXIETY" ? "Social Anxiety" : focus === "MOOD_DEPRESSION" ? "Mood & Depression" : "Emotion Regulation";
  const nPatients = Math.max(3, Math.min(12, opts.patients));
  const nSessions = Math.max(3, Math.min(12, opts.sessions));
  // How much history to fabricate. Defaults to all-but-one, and clamped to all-but-one rather than
  // to nSessions: ensureNextSession() refuses to schedule past sessionCount, so a cohort generated
  // with every session already played has nothing left to start and can never be demoed. The form's
  // "Pre-filled" default used to be a fixed 5, which silently consumed a 3-session cohort whole.
  const nPlayed = Math.max(0, Math.min(opts.preGenerated ?? nSessions - 1, nSessions - 1));

  const members: MemberSpec[] = [];
  const used = new Set<string>();

  // 1) fill from unassigned patients (no active enrollment)
  const unassigned = await prisma.patient.findMany({
    where: { enrollments: { none: { status: "ACTIVE" } } },
    take: nPatients,
  });
  for (const p of unassigned) {
    used.add(p.firstName);
    members.push({
      first: p.firstName, last: p.lastName,
      age: 2026 - p.dob.getUTCFullYear(),
      trend: randTrend(nPlayed),
      goals: ["Sustain group attendance", "Practice a coping skill"],
      existingPatientId: p.id,
    });
  }

  // 2) generate new patients to cover any shortfall
  for (let i = members.length; i < nPatients; i++) {
    let first = pick(FIRST);
    while (used.has(first)) first = pick(FIRST);
    used.add(first);
    members.push({
      first, last: pick(LAST), age: 14 + Math.floor(Math.random() * 4),
      trend: randTrend(nPlayed),
      goals: ["Sustain group attendance", "Practice a coping skill"],
    });
  }

  const res = await seedCohort(prisma, {
    orgId, clinicianId: clinician!.id,
    name: opts.name?.trim() || `${meetsOn} ${ampm} · ${focusName}`,
    focus, meetsOn, meetsAt, ageLow: 14, ageHigh: 17, sessionCount: nSessions, sessionsPlayed: nPlayed,
    // Everything pre-generated is finished history, so every one of those notes is filed. The one
    // session left unrun is where new draft notes come from — that's the demo path.
    notes: "all",
    module: pick(MODULES_BY_FOCUS[focus]), members,
  });

  return res;
}

// --- Targeted deletes (admin console) -------------------------------------------------------
//
// resetAll() is all-or-nothing; these remove one entity. Every one of them walks the FK tree
// child-first inside a $transaction for the same reason resetAll() does: MySQL rejects a parent
// DELETE while children reference it, and a half-finished cascade leaves orphan rows that break
// the pipeline later. Prisma's schema has no onDelete: Cascade — deliberately, so a delete is
// always an explicit, reviewable list rather than a silent chain reaction.

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Everything that hangs off a set of sessions: notes, claims, engagement, media, transcripts. */
async function deleteSessionRows(tx: Tx, sessionIds: string[]) {
  if (sessionIds.length === 0) return;
  const inSessions = { in: sessionIds };
  const ofSession = {
    OR: [
      { individualNote: { sessionId: inSessions } },
      { groupNote: { sessionId: inSessions } },
    ],
  };
  await tx.noteClaim.deleteMany({ where: { section: ofSession } });
  await tx.noteSection.deleteMany({ where: ofSession });
  await tx.groupNote.deleteMany({ where: { sessionId: inSessions } });
  await tx.individualNote.deleteMany({ where: { sessionId: inSessions } });
  await tx.riskFlag.deleteMany({ where: { sessionId: inSessions } });
  await tx.engagementMetric.deleteMany({ where: { sessionId: inSessions } });
  await tx.engagementEvent.deleteMany({ where: { sessionId: inSessions } });
  await tx.attendance.deleteMany({ where: { sessionId: inSessions } });
  await tx.transcript.deleteMany({ where: { track: { sessionId: inSessions } } });
  await tx.mediaTrack.deleteMany({ where: { sessionId: inSessions } });
  await tx.session.deleteMany({ where: { id: inSessions } });
}

/**
 * Delete a cohort with its sessions, enrollments, goals, and baselines. Patients survive and fall
 * back to "Unassigned" — a teen is a person in the org, not a property of one group, and deleting
 * the group they were in should not delete them.
 */
export async function deleteCohort(prisma: PrismaClient, cohortId: string) {
  const sessions = await prisma.session.findMany({ where: { cohortId }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    await deleteSessionRows(tx, sessions.map((s) => s.id));
    await tx.baseline.deleteMany({ where: { enrollment: { cohortId } } });
    await tx.goal.deleteMany({ where: { enrollment: { cohortId } } });
    await tx.enrollment.deleteMany({ where: { cohortId } });
    await tx.cohortClinician.deleteMany({ where: { cohortId } });
    await tx.cohort.delete({ where: { id: cohortId } });
  });
}

/** Delete a patient and every per-patient row: notes, engagement, media, enrollments, guardians. */
export async function deletePatient(prisma: PrismaClient, patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { userId: true } });
  if (!patient) return;
  await prisma.$transaction(async (tx) => {
    await tx.noteClaim.deleteMany({ where: { section: { individualNote: { patientId } } } });
    await tx.noteSection.deleteMany({ where: { individualNote: { patientId } } });
    await tx.individualNote.deleteMany({ where: { patientId } });
    await tx.riskFlag.deleteMany({ where: { patientId } });
    await tx.engagementMetric.deleteMany({ where: { patientId } });
    await tx.engagementEvent.deleteMany({ where: { patientId } });
    await tx.attendance.deleteMany({ where: { patientId } });
    await tx.transcript.deleteMany({ where: { track: { patientId } } });
    await tx.mediaTrack.deleteMany({ where: { patientId } });
    await tx.baseline.deleteMany({ where: { enrollment: { patientId } } });
    await tx.goal.deleteMany({ where: { enrollment: { patientId } } });
    await tx.enrollment.deleteMany({ where: { patientId } });
    await tx.consentRecord.deleteMany({ where: { patientId } });
    await tx.guardian.deleteMany({ where: { patientId } });
    await tx.patient.delete({ where: { id: patientId } });
    // Seeded patients have a login row; loose ones don't.
    if (patient.userId) await tx.user.delete({ where: { id: patient.userId } });
  });
}

/**
 * Delete a therapist. Refuses while they still facilitate a cohort: every cohort needs a
 * facilitator, and silently orphaning one would leave a caseload nobody owns. Reassign or delete
 * the cohort first.
 */
export async function deleteTherapist(prisma: PrismaClient, clinicianId: string) {
  const clinician = await prisma.clinician.findUnique({
    where: { id: clinicianId },
    select: { userId: true, _count: { select: { cohorts: true } } },
  });
  if (!clinician) return;
  if (clinician._count.cohorts > 0) {
    throw new Error(
      "This therapist still facilitates a cohort. Delete or reassign the cohort first."
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.clinician.delete({ where: { id: clinicianId } });
    await tx.user.delete({ where: { id: clinician.userId } });
  });
}
