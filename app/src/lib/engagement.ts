import { prisma } from "./db";

// Recompute EngagementMetric for a session from its raw CPaaS events (docs/engagement-spec.md).
// No-op when the session has no events (e.g. seeded/test sessions with no live call). Runs as the
// first pipeline stage so notes/caseload reflect the real telemetry captured during the session.

const SOFTCAP = { talkS: 480, turns: 10, cameraOnPct: 100, presencePct: 100, chatCount: 10 };
const WEIGHT = { talkS: 0.35, turns: 0.25, cameraOnPct: 0.15, presencePct: 0.15, chatCount: 0.1 };

function participationIndex(sig: { talkS: number; turns: number; cameraOnPct: number; presencePct: number; chatCount: number }): number {
  return Math.round(
    100 *
      (WEIGHT.talkS * Math.min(sig.talkS / SOFTCAP.talkS, 1) +
        WEIGHT.turns * Math.min(sig.turns / SOFTCAP.turns, 1) +
        WEIGHT.cameraOnPct * Math.min(sig.cameraOnPct / SOFTCAP.cameraOnPct, 1) +
        WEIGHT.presencePct * Math.min(sig.presencePct / SOFTCAP.presencePct, 1) +
        WEIGHT.chatCount * Math.min(sig.chatCount / SOFTCAP.chatCount, 1))
  );
}

type Status = "ESTABLISHING" | "CHECK_IN" | "WATCH" | "STABLE" | "IMPROVING";
function statusFromDelta(pi: number, baseline: number | null | undefined): Status {
  if (baseline == null || baseline === 0) return "ESTABLISHING";
  const delta = (pi - baseline) / baseline;
  if (delta <= -0.5) return "CHECK_IN";
  if (delta <= -0.25) return "WATCH";
  if (delta >= 0.15) return "IMPROVING";
  return "STABLE";
}

export async function recomputeEngagement(sessionId: string): Promise<number> {
  const events = await prisma.engagementEvent.findMany({ where: { sessionId }, orderBy: { atMs: "asc" } });
  if (events.length === 0) return 0;

  // How long the session actually ran. This is the denominator for presence, so getting it wrong
  // corrupts every presence number in the app.
  //
  // It used to be `Math.max(...atMs, 60 * 60 * 1000)`. The comment called the hour a "fallback",
  // but Math.max makes it a FLOOR: every session was treated as at least an hour long, so a teen
  // who sat through the whole of a 90-second demo session scored 90/3600 = 2% presence. Nobody
  // running a full-length group would have noticed; every short session was wrong.
  //
  // The truth is the LIVE → ENDED wall clock, which setSessionStatus() already audits. Event
  // timestamps are the fallback: they're each client's own `Date.now() - joinTime`, so they only
  // approximate session length (the facilitator joins first, so their clock is closest).
  const marks = await prisma.auditEvent.findMany({
    where: { entityType: "Session", entityId: sessionId, action: { in: ["session.live", "session.ended"] } },
    orderBy: { at: "asc" },
  });
  const liveAt = marks.find((m) => m.action === "session.live")?.at;
  const endedAt = [...marks].reverse().find((m) => m.action === "session.ended")?.at;
  const wallMs = liveAt && endedAt ? endedAt.getTime() - liveAt.getTime() : 0;
  const lastEventMs = Math.max(...events.map((e) => e.atMs));
  // Never zero — it divides. Take the longer of the two so a clock skew can't push presence over
  // 100%, and so a session whose participants closed the tab without a LEAVE still measures right.
  const sessionMs = Math.max(wallMs, lastEventMs, 1000);
  const byPatient = new Map<string, typeof events>();
  for (const e of events) {
    // "transcription" is Daily's synthetic sender id, not a participant. It used to slip through
    // here and mint an EngagementMetric row for a patient that doesn't exist.
    if (e.patientId === "transcription" || e.patientId.startsWith("clinician-")) continue;
    const arr = byPatient.get(e.patientId) ?? [];
    arr.push(e);
    byPatient.set(e.patientId, arr);
  }

  let count = 0;
  for (const [patientId, evs] of byPatient) {
    let talkS = 0, turns = 0, cameraOnMs = 0, presenceMs = 0, chatCount = 0;
    let speakStart: number | null = null, camStart: number | null = null, joinAt: number | null = null;
    for (const e of evs) {
      switch (e.type) {
        case "SPEAKING_START": speakStart = e.atMs; turns++; break;
        case "SPEAKING_END": if (speakStart != null) { talkS += (e.atMs - speakStart) / 1000; speakStart = null; } break;
        case "CAMERA_ON": camStart = e.atMs; break;
        case "CAMERA_OFF": if (camStart != null) { cameraOnMs += e.atMs - camStart; camStart = null; } break;
        case "JOIN": joinAt = e.atMs; break;
        case "LEAVE": if (joinAt != null) { presenceMs += e.atMs - joinAt; joinAt = null; } break;
        case "CHAT": chatCount++; break;
      }
    }
    if (speakStart != null) talkS += (sessionMs - speakStart) / 1000;
    if (camStart != null) cameraOnMs += sessionMs - camStart;
    if (joinAt != null) presenceMs += sessionMs - joinAt;

    const presencePct = Math.min(100, Math.round((presenceMs / sessionMs) * 100));
    const cameraOnPct = Math.min(100, Math.round((cameraOnMs / Math.max(presenceMs, 1)) * 100));
    const sig = { talkS: Math.round(talkS), turns, cameraOnPct, presencePct, chatCount };
    const pi = participationIndex(sig);

    const enrollment = await prisma.enrollment.findFirst({ where: { patientId, cohort: { sessions: { some: { id: sessionId } } } }, include: { baseline: true } });
    const status = statusFromDelta(pi, enrollment?.baseline?.participationIndex ?? null);

    await prisma.engagementMetric.upsert({
      where: { sessionId_patientId: { sessionId, patientId } },
      create: { sessionId, patientId, ...sig, participationIndex: pi, status },
      update: { ...sig, participationIndex: pi, status },
    });
    count++;
  }

  // ---- Absence ----------------------------------------------------------------------------
  // Nothing used to write Attendance rows at all, so pipeline.ts's `attendance.find(...)?.present
  // ?? true` treated every enrolled teen as present — a session only Chloe attended reported no
  // absences. And because the loop above iterates *events*, a no-show produced no metric row
  // whatsoever, so the caseload kept displaying their previous session's participation. That is
  // worse than missing data: it shows a number that is quietly false.
  //
  // So: mark who actually turned up, and write an explicit zero for everyone who didn't.
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { cohortId: true },
  });
  if (!session) return count;

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: session.cohortId, status: "ACTIVE" },
    include: { baseline: true },
  });

  for (const e of enrollments) {
    const attended = byPatient.has(e.patientId);
    await prisma.attendance.upsert({
      where: { sessionId_patientId: { sessionId, patientId: e.patientId } },
      create: { sessionId, patientId: e.patientId, present: attended },
      update: { present: attended },
    });

    if (attended) continue;

    // Absent: zeroes, not silence. ABSENT is its own status so the caseload can distinguish
    // "wasn't here" from "here but quiet" — they call for completely different follow-up.
    await prisma.engagementMetric.upsert({
      where: { sessionId_patientId: { sessionId, patientId: e.patientId } },
      create: {
        sessionId, patientId: e.patientId,
        talkS: 0, turns: 0, cameraOnPct: 0, presencePct: 0, chatCount: 0,
        participationIndex: 0, status: "ABSENT",
      },
      update: {
        talkS: 0, turns: 0, cameraOnPct: 0, presencePct: 0, chatCount: 0,
        participationIndex: 0, status: "ABSENT",
      },
    });
    count++;
  }

  return count;
}
