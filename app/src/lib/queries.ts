import { cache } from "react";
import { prisma } from "./db";
import type { EngagementStatus } from "./status";
import { simClinicianId } from "./sim";

// ---- helpers ----

/**
 * A session that has happened — the room closed, whether or not its notes exist yet.
 * Seeded history is ENDED and only becomes READY once someone runs the pipeline on it, so keying
 * "latest completed session" off READY alone would ignore every session that hasn't been processed.
 */
function isCompleted(status: string): boolean {
  return status === "ENDED" || status === "PROCESSING" || status === "READY" || status === "FAILED";
}

function ageFromDob(dob: Date): number {
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
  return a;
}

export type CohortCard = {
  id: string;
  code: string;
  name: string;
  members: number;
  ageLow: number;
  ageHigh: number;
  focus: string;
  liveSession: { index: number } | null;
  liveSessionId: string | null;
  currentSessionId: string | null;
  latestIndex: number | null;
  module: string;
  checkIns: number;
  notesToReview: number;
};

export type Dashboard = {
  clinicianName: string;
  credential: string;
  totals: { cohorts: number; members: number; checkIns: number };
  topCounts: { live: number; upcoming: number; notes: number; checkIns: number };
  cohorts: CohortCard[];
};

export const getDashboard = cache(async (): Promise<Dashboard | null> => {
  const simId = await simClinicianId();
  const clinician =
    (simId ? await prisma.clinician.findUnique({ where: { id: simId }, include: { user: true } }) : null) ??
    (await prisma.clinician.findFirst({ include: { user: true } }));
  if (!clinician) return null;

  const cohorts = await prisma.cohort.findMany({
    where: { clinicians: { some: { clinicianId: clinician.id } } },
    include: {
      _count: { select: { enrollments: true } },
      sessions: { orderBy: { index: "desc" }, select: { id: true, index: true, status: true, module: true } },
    },
    orderBy: { name: "asc" },
  });

  const cards: CohortCard[] = [];
  let totalMembers = 0, totalCheckIns = 0, totalNotes = 0, totalLive = 0, totalUpcoming = 0;

  for (const c of cohorts) {
    totalMembers += c._count.enrollments;
    const live = c.sessions.find((s) => s.status === "LIVE") ?? null;
    const upcoming = c.sessions.filter((s) => s.status === "SCHEDULED").length;
    const latestCompleted = c.sessions.find((s) => isCompleted(s.status)) ?? null;
    totalLive += live ? 1 : 0;
    totalUpcoming += upcoming;

    let checkIns = 0;
    if (latestCompleted) {
      checkIns = await prisma.engagementMetric.count({
        where: { sessionId: latestCompleted.id, status: "CHECK_IN" },
      });
    }
    const notesToReview = await prisma.individualNote.count({
      where: { session: { cohortId: c.id }, status: { in: ["DRAFT", "IN_REVIEW"] } },
    });
    totalCheckIns += checkIns;
    totalNotes += notesToReview;

    // Live room targets the actionable session: live now → next upcoming → last completed.
    const nextScheduled = c.sessions.filter((s) => s.status === "SCHEDULED").sort((a, b) => a.index - b.index)[0] ?? null;
    const current = live ?? nextScheduled ?? latestCompleted ?? c.sessions[0];
    cards.push({
      id: c.id,
      code: c.code,
      name: c.name,
      members: c._count.enrollments,
      ageLow: c.ageBandLow,
      ageHigh: c.ageBandHigh,
      focus: c.focus,
      liveSession: live ? { index: live.index } : null,
      liveSessionId: live?.id ?? null,
      currentSessionId: current?.id ?? null,
      latestIndex: latestCompleted?.index ?? null,
      module: current?.module ?? "",
      checkIns,
      notesToReview,
    });
  }

  return {
    clinicianName: clinician.user.displayName,
    credential: clinician.credential,
    totals: { cohorts: cohorts.length, members: totalMembers, checkIns: totalCheckIns },
    topCounts: { live: totalLive, upcoming: totalUpcoming, notes: totalNotes, checkIns: totalCheckIns },
    cohorts: cards,
  };
});

// ---- Note review ----

export type ClaimView = {
  id: string;
  text: string;
  verdict: "SUPPORTED" | "UNSUPPORTED" | "UNCERTAIN" | "CLINICIAN_ATTESTED";
  evidence: { quote: string; startMs: number; endMs: number; kind?: "transcript" | "metric" }[];
};
export type SectionView = { id: string; key: string; body: string; edited: boolean; claims: ClaimView[] };
export type NoteDetail = {
  id: string;
  patientId: string;
  patientName: string;
  /** Set when the narrative and the measured participation disagree — raised as a banner. */
  signalAlignment: { status: "CONSISTENT" | "DIVERGENT"; note: string } | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED";
  sessionIndex: number;
  goalSignals: { goal: string; status: string }[];
  sections: SectionView[];
  acuteFlag: { id: string; category: string; status: string; disposition: string; quote: string } | null;
  approvable: boolean;
  blockedReason: string | null;
  audit: { text: string; at: string }[];
};
export type GroupNoteView = {
  id: string;
  status: string;
  sections: { key: string; label: string; body: string }[];
  goalIndicators: { label: string; status: string }[];
};
export type NotesReview = {
  cohort: { id: string; name: string };
  sessionIndex: number | null;
  /** The session in view — needed to generate notes for one that doesn't have them yet. */
  sessionId: string | null;
  hasNotes: boolean;
  completedCount: number;
  sessions: { index: number; isNewest: boolean; tag: string; hasNotes: boolean }[];
  sessionTag: string;
  scopeLine: string;
  list: { noteId: string; patientName: string; status: string }[];
  approvedCount: number;
  total: number;
  selected: NoteDetail | null;
  group: GroupNoteView | null;
};

const SECTION_LABELS: Record<string, string> = {
  PRESENTATION_SUBJECTIVE: "Presentation & subjective",
  PARTICIPATION: "Participation",
  INTERVENTIONS_RESPONSE: "Interventions & response",
  PLAN: "Plan",
  SESSION_OVERVIEW: "Session overview",
  GROUP_PROCESS_THEMES: "Group process & themes",
  FACILITATOR_OBSERVATIONS: "Facilitator observations",
};
const GROUP_ORDER = ["SESSION_OVERVIEW", "GROUP_PROCESS_THEMES", "FACILITATOR_OBSERVATIONS", "PLAN"];
const SECTION_ORDER = ["PRESENTATION_SUBJECTIVE", "PARTICIPATION", "INTERVENTIONS_RESPONSE", "PLAN"];

export function sectionLabel(key: string): string {
  return SECTION_LABELS[key] ?? key;
}
function describeAudit(action: string): string {
  return ({
    "note.approved": "Approved & signed off",
    "note.section.edited": "Section edited",
    "note.claim.attested": "Claim attested by clinician",
    "risk.flag.dispositioned": "Risk flag dispositioned",
    "session.processed": "Notes generated from session capture",
  } as Record<string, string>)[action] ?? action;
}

export async function getNotesReview(cohortId: string, selectedNoteId?: string, selectedSession?: number, selectedPatientId?: string): Promise<NotesReview | null> {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: { sessions: { orderBy: { index: "asc" } } },
  });
  if (!cohort) return null;

  // Sessions that actually have generated notes — these populate the picker (newest first).
  const noted = await prisma.individualNote.groupBy({ by: ["sessionId"], where: { session: { cohortId } } });
  const notedIds = new Set(noted.map((n) => n.sessionId));
  // Only completed sessions are reviewable — a LIVE (in-progress) session is never a "noted" session,
  // even if a sim/pipeline left notes on it.
  // Every session that has finished is reviewable. Ones without notes yet stay in the picker and
  // offer to generate them — otherwise a cohort's history is unreachable from the UI.
  const reviewable = cohort.sessions.filter((s) => isCompleted(s.status)).sort((a, b) => b.index - a.index);
  const liveSession = cohort.sessions.find((s) => s.status === "LIVE") ?? null;

  if (reviewable.length === 0) {
    return {
      cohort: { id: cohort.id, name: cohort.name },
      sessionIndex: null, sessionId: null, hasNotes: false, completedCount: 0,
      sessions: [], sessionTag: "", scopeLine: "",
      list: [], approvedCount: 0, total: 0, selected: null, group: null,
    };
  }

  const newest = reviewable[0];
  const latestNoted = reviewable.find((s) => notedIds.has(s.id)) ?? null;
  const reviewSession =
    (selectedSession != null && reviewable.find((s) => s.index === selectedSession)) || latestNoted || newest;
  const isNewest = reviewSession.index === newest.index;
  const hasNotes = notedIds.has(reviewSession.id);

  const pickerSessions = reviewable.map((s) => ({
    index: s.index,
    isNewest: s.index === newest.index,
    hasNotes: notedIds.has(s.id),
    tag: !notedIds.has(s.id)
      ? "No notes"
      : latestNoted && s.index === latestNoted.index
      ? "In review"
      : "Filed",
  }));
  const sessionTag = !hasNotes ? " · no notes" : isNewest ? " · newest" : " · filed";
  const scopeLine = !hasNotes
    ? `Session ${reviewSession.index} has ended but its notes haven't been generated yet.`
    : isNewest && liveSession
    ? `Session ${reviewSession.index} is your most recent completed session. Session ${liveSession.index} is live now — its notes will be ready once it wraps.`
    : isNewest
    ? `Session ${reviewSession.index} is your most recent completed session.`
    : `Session ${reviewSession.index} was approved and filed to your EHR. Shown read-only from the archive.`;

  const base = {
    cohort: { id: cohort.id, name: cohort.name },
    sessionIndex: reviewSession.index,
    sessionId: reviewSession.id,
    hasNotes,
    completedCount: reviewable.length,
    sessions: pickerSessions,
    sessionTag,
    scopeLine,
  };

  if (!hasNotes) {
    return { ...base, list: [], approvedCount: 0, total: 0, selected: null, group: null };
  }

  const notes = await prisma.individualNote.findMany({
    where: { sessionId: reviewSession.id },
    include: { session: { select: { index: true } } },
  });
  const patients = await prisma.patient.findMany({
    where: { id: { in: notes.map((n) => n.patientId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameOf = (pid: string) => {
    const p = patients.find((x) => x.id === pid);
    return p ? `${p.firstName} ${p.lastName}` : pid.slice(0, 6);
  };

  notes.sort((a, b) => nameOf(a.patientId).localeCompare(nameOf(b.patientId)));
  const list = notes.map((n) => ({ noteId: n.id, patientName: nameOf(n.patientId), status: n.status }));
  const approvedCount = notes.filter((n) => n.status === "APPROVED").length;

  // Note ids are per-session, so they can't survive a session change — switching sessions used to
  // silently snap back to the first member. Fall back to the same PATIENT's note in the newly
  // selected session, and only then to the first note.
  const byPatient = selectedPatientId ? notes.find((n) => n.patientId === selectedPatientId)?.id : undefined;
  const chosenId = (selectedNoteId && notes.some((n) => n.id === selectedNoteId) ? selectedNoteId : undefined) ?? byPatient ?? notes[0]?.id;
  let selected: NoteDetail | null = null;

  if (chosenId) {
    const note = await prisma.individualNote.findUnique({
      where: { id: chosenId },
      include: { session: { select: { index: true } }, sections: { include: { claims: true } } },
    });
    if (note) {
      const flag = await prisma.riskFlag.findFirst({
        where: { sessionId: note.sessionId, patientId: note.patientId, severity: "ACUTE" },
      });
      const acuteUnresolved = flag && flag.status !== "ACKNOWLEDGED" && flag.status !== "CLOSED";

      // Filing needs one clinician sign-off; grounding is informational. Only an unresolved
      // acute risk flag (a safety gate) blocks approval.
      let blockedReason: string | null = null;
      if (note.status !== "APPROVED" && acuteUnresolved) blockedReason = "Unresolved acute flag — disposition it first.";

      const sections: SectionView[] = note.sections
        .sort((a, b) => SECTION_ORDER.indexOf(a.key) - SECTION_ORDER.indexOf(b.key))
        .map((s) => ({
          id: s.id,
          key: s.key,
          body: s.bodyEdited ?? s.bodyDraft,
          edited: s.bodyEdited != null,
          claims: s.claims.map((c) => ({
            id: c.id,
            text: c.text,
            verdict: c.verdict,
            evidence: Array.isArray(c.evidence) ? (c.evidence as unknown as ClaimView["evidence"]) : [],
          })),
        }));

      const auditRows = await prisma.auditEvent.findMany({ where: { entityType: "IndividualNote", entityId: note.id }, orderBy: { at: "desc" }, take: 6 });
      const audit = auditRows.map((a) => ({ text: describeAudit(a.action), at: a.at.toISOString() }));
      selected = {
        id: note.id,
        patientId: note.patientId,
        patientName: nameOf(note.patientId),
        status: note.status,
        sessionIndex: note.session.index,
        goalSignals: (note.goalSignals as unknown as { goal: string; status: string }[]) ?? [],
        signalAlignment: (note.signalAlignment as unknown as NoteDetail["signalAlignment"]) ?? null,
        sections,
        acuteFlag: flag
          ? {
              id: flag.id,
              category: flag.category,
              status: flag.status,
              disposition: flag.disposition,
              quote: Array.isArray(flag.evidence) && flag.evidence[0] ? (flag.evidence[0] as { quote: string }).quote : "",
            }
          : null,
        approvable: note.status !== "APPROVED" && !acuteUnresolved,
        blockedReason,
        audit,
      };
    }
  }

  // group note for the session
  const gn = await prisma.groupNote.findUnique({ where: { sessionId: reviewSession.id }, include: { sections: true } });
  const group: GroupNoteView | null = gn
    ? {
        id: gn.id,
        status: gn.status,
        sections: [...gn.sections].sort((a, b) => GROUP_ORDER.indexOf(a.key) - GROUP_ORDER.indexOf(b.key)).map((s) => ({ key: s.key, label: sectionLabel(s.key), body: s.bodyEdited ?? s.bodyDraft })),
        goalIndicators: (gn.goalIndicators as unknown as { label: string; status: string }[]) ?? [],
      }
    : null;

  return { ...base, list, approvedCount, total: notes.length, selected, group };
}

// ---- Session prep (step 2) ----
export type PrepRow = { patientId: string; name: string; age: number; status: EngagementStatus; lastTalkMin: number; trend: number[]; priorNote: string | null };
export type SessionPrep = {
  cohort: { id: string; name: string; module: string; currentIndex: number | null };
  priorityDrawIn: string[];
  absentLast: string[];
  roster: PrepRow[];
};

export async function getSessionPrep(cohortId: string): Promise<SessionPrep | null> {
  const caseload = await getCohortCaseload(cohortId);
  if (!caseload) return null;

  // most recent prior individual note per patient → Presentation snippet
  const notes = await prisma.individualNote.findMany({
    where: { session: { cohortId } },
    include: { session: { select: { index: true } }, sections: { where: { key: "PRESENTATION_SUBJECTIVE" } } },
  });
  const snippetOf = new Map<string, string>();
  for (const n of notes.sort((a, b) => a.session.index - b.session.index)) {
    const body = n.sections[0]?.bodyEdited ?? n.sections[0]?.bodyDraft;
    if (body) snippetOf.set(n.patientId, body.length > 120 ? body.slice(0, 120) + "…" : body);
  }

  const roster: PrepRow[] = caseload.rows.map((r) => ({
    patientId: r.patientId, name: r.name, age: r.age, status: r.status,
    lastTalkMin: +(r.latestTalkS / 60).toFixed(1), trend: r.trend, priorNote: snippetOf.get(r.patientId) ?? null,
  }));

  const attention = new Set(["ABSENT", "CHECK_IN", "WATCH", "WORTH_A_LOOK"]);
  return {
    cohort: { id: caseload.cohort.id, name: caseload.cohort.name, module: caseload.cohort.module, currentIndex: caseload.cohort.currentIndex },
    priorityDrawIn: caseload.rows.filter((r) => attention.has(r.status)).map((r) => r.name),
    absentLast: caseload.rows.filter((r) => !r.presentLast).map((r) => r.name),
    roster,
  };
}

// ---- Kid detail / trend ----
export type KidMetric = { label: string; value: string; delta: string | null; deltaNeg: boolean };
export type KidDetail = {
  cohort: { id: string; name: string };
  patientId: string;
  name: string;
  age: number;
  status: EngagementStatus;
  trend: number[];
  labels: string[];
  attendance: boolean[];
  attendedCount: number;
  totalSessions: number;
  missedLabels: string[];
  presentLatest: boolean;
  latestLabel: string | null;
  baseline: number | null;
  metrics: KidMetric[];
  history: { session: string; text: string }[];
};

export async function getKidDetail(cohortId: string, patientId: string): Promise<KidDetail | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { cohortId, patientId }, include: { patient: true, baseline: true, cohort: true },
  });
  if (!enrollment) return null;

  const mets = (await prisma.engagementMetric.findMany({
    where: { patientId, session: { cohortId } }, include: { session: { select: { index: true } } },
  })).sort((a, b) => a.session.index - b.session.index);
  const latest = mets[mets.length - 1];
  const prior = mets[mets.length - 2];

  // attendance per session (default present if no record, matching pipeline.ts)
  const attRows = await prisma.attendance.findMany({ where: { patientId, session: { cohortId } }, include: { session: { select: { index: true } } } });
  const presentByIndex = new Map(attRows.map((a) => [a.session.index, a.present]));
  const attendance = mets.map((m) => presentByIndex.get(m.session.index) ?? true);
  const attendedCount = attendance.filter(Boolean).length;
  const missedLabels = mets.filter((m) => !(presentByIndex.get(m.session.index) ?? true)).map((m) => `S${m.session.index}`);
  const presentLatest = attendance.length ? attendance[attendance.length - 1] : true;
  const latestLabel = latest ? `S${latest.session.index}` : null;
  const baseline = enrollment.baseline?.participationIndex ?? null;
  const now = new Date();
  const age = now.getFullYear() - enrollment.patient.dob.getFullYear() - (now < new Date(now.getFullYear(), enrollment.patient.dob.getMonth(), enrollment.patient.dob.getDate()) ? 1 : 0);

  const pct = (cur: number, ref: number | null | undefined) => (ref && ref !== 0 ? `${cur - ref > 0 ? "+" : ""}${Math.round(((cur - ref) / ref) * 100)}%` : null);
  const metrics: KidMetric[] = latest ? [
    { label: "Participation index", value: String(latest.participationIndex), delta: pct(latest.participationIndex, baseline), deltaNeg: baseline ? latest.participationIndex < baseline : false },
    { label: "Talk time", value: `${(latest.talkS / 60).toFixed(1)} min`, delta: prior ? pct(latest.talkS, prior.talkS) : null, deltaNeg: prior ? latest.talkS < prior.talkS : false },
    { label: "Speaking turns", value: String(latest.turns), delta: prior ? pct(latest.turns, prior.turns) : null, deltaNeg: prior ? latest.turns < prior.turns : false },
    { label: "Camera on", value: `${latest.cameraOnPct}%`, delta: null, deltaNeg: false },
    { label: "Presence", value: `${latest.presencePct}%`, delta: null, deltaNeg: false },
  ] : [];

  const notes = await prisma.individualNote.findMany({
    where: { patientId, session: { cohortId } },
    include: { session: { select: { index: true } }, sections: { where: { key: "PRESENTATION_SUBJECTIVE" } } },
  });
  const history = notes
    .sort((a, b) => b.session.index - a.session.index)
    .map((n) => ({ session: `Session ${n.session.index}`, text: (n.sections[0]?.bodyEdited ?? n.sections[0]?.bodyDraft ?? "—") }));

  return {
    cohort: { id: enrollment.cohort.id, name: enrollment.cohort.name },
    patientId, name: `${enrollment.patient.firstName} ${enrollment.patient.lastName}`, age,
    status: (latest?.status ?? "ESTABLISHING") as EngagementStatus,
    trend: mets.map((m) => m.participationIndex), labels: mets.map((m) => `S${m.session.index}`),
    attendance, attendedCount, totalSessions: mets.length, missedLabels, presentLatest, latestLabel,
    baseline, metrics, history,
  };
}

export type CaseloadRow = {
  patientId: string;
  name: string;
  age: number;
  trend: number[];
  /**
   * Whether the member actually attended each session in `trend`, index-aligned.
   *
   * A missed session is recorded as a zero-participation metric, which is right for "what happened
   * in session 3" and wrong for "is this member disengaging": one absence dragged the baseline
   * down AND read as a 100% collapse against it. Callers comparing participation over time must
   * drop the sessions where this is false — see `attendedTrend`.
   */
  attended: boolean[];
  status: EngagementStatus;
  latestTalkS: number;
  latestTurns: number;
  presentLast: boolean;
};

/** The participation trend with missed sessions removed — the only series safe to compare. */
export function attendedTrend(r: { trend: number[]; attended: boolean[] }): number[] {
  return r.trend.filter((_, i) => r.attended[i] !== false);
}

export type Caseload = {
  cohort: { id: string; code: string; name: string; focus: string; meetsOn: string; meetsAt: string; ageLow: number; ageHigh: number; members: number; currentIndex: number | null; module: string; nextIndex: number | null; nextModule: string; liveSessionId: string | null };
  rows: CaseloadRow[];
};

export async function getCohortCaseload(cohortId: string): Promise<Caseload | null> {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      enrollments: { include: { patient: true } },
      sessions: { orderBy: { index: "asc" } },
    },
  });
  if (!cohort) return null;
  const code = cohort.code;

  const live = cohort.sessions.find((s) => s.status === "LIVE") ?? null;
  const latestCompleted = [...cohort.sessions].reverse().find((s) => isCompleted(s.status)) ?? null;
  const current = live ?? latestCompleted;
  // The cohort page needs BOTH, and conflating them is what made a finished cohort read
  // "Next up · Session 6" with six sessions already complete: `current` is the most recent
  // *completed* session (right for the trends line) and was also driving the "Next up" band.
  const nextScheduled = cohort.sessions.find((s) => s.status === "SCHEDULED") ?? null;

  // all metrics for this cohort's sessions, joined with session index
  const metrics = await prisma.engagementMetric.findMany({
    where: { session: { cohortId } },
    include: { session: { select: { index: true } } },
  });
  const attendance = await prisma.attendance.findMany({
    where: { session: { cohortId } },
    include: { session: { select: { index: true } } },
  });

  const rows: CaseloadRow[] = cohort.enrollments.map((e) => {
    const mine = metrics
      .filter((m) => m.patientId === e.patientId)
      .sort((a, b) => a.session.index - b.session.index);
    const trend = mine.map((m) => m.participationIndex);
    const last = mine[mine.length - 1];
    const mineAtt = attendance
      .filter((a) => a.patientId === e.patientId)
      .sort((a, b) => a.session.index - b.session.index);
    // Older sessions predate the Attendance table; absent a row, assume they were there.
    const presentAt = new Map(mineAtt.map((a) => [a.session.index, a.present]));
    const attended = mine.map((m) => presentAt.get(m.session.index) ?? true);
    const lastAtt = mineAtt[mineAtt.length - 1];
    return {
      patientId: e.patientId,
      name: `${e.patient.firstName} ${e.patient.lastName}`,
      age: ageFromDob(e.patient.dob),
      trend,
      attended,
      status: (last?.status ?? "ESTABLISHING") as EngagementStatus,
      latestTalkS: last?.talkS ?? 0,
      latestTurns: last?.turns ?? 0,
      presentLast: lastAtt?.present ?? false,
    };
  });

  // order: most attention first
  const order: Record<string, number> = { ABSENT: 0, CHECK_IN: 1, WATCH: 2, WORTH_A_LOOK: 2, ESTABLISHING: 3, STABLE: 4, IMPROVING: 5 };
  // Tie-break on the last session they were actually IN — otherwise every absent member ties at 0.
  const lastAttended = (r: CaseloadRow) => attendedTrend(r).at(-1) ?? 0;
  rows.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5) || lastAttended(a) - lastAttended(b));

  return {
    cohort: {
      id: cohort.id, code, name: cohort.name, focus: cohort.focus,
      meetsOn: cohort.meetsOn, meetsAt: cohort.meetsAt,
      ageLow: cohort.ageBandLow, ageHigh: cohort.ageBandHigh, members: cohort.enrollments.length,
      currentIndex: current?.index ?? null, module: current?.module ?? "",
      nextIndex: nextScheduled?.index ?? null, nextModule: nextScheduled?.module ?? "",
      liveSessionId: live?.id ?? null,
    },
    rows,
  };
}
