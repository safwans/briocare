import { prisma } from "./db";
import { recomputeEngagement } from "./engagement";
import { profileForStatus, transcriptForProfile } from "./fixtures";
import { getAsrProvider, isRealAudioUrl } from "./asr";
import { scanForRisk } from "./risk";
import { groundedIndividualNote, generateGroupNote, type TranscriptSegment, type GroundedNote } from "./notegen";

const TEMPLATE_VER = "note-v0";
const CONCURRENCY = 4;

type MetricLite = { participationIndex: number; talkS: number; cameraOnPct: number; presencePct: number; status: string } | null;

// The engagement status is the same signal the caseload flags a teen on, so the note writer has to
// see it — previously only raw numbers were passed and the status was dropped, which let a note
// read "engaged" while the caseload showed the same teen declining. Direction is spelled out in
// words rather than left to be inferred from a percentage.
function summarizeParticipation(m: MetricLite, baseline: number | null): string {
  if (!m) return "no participation data captured for this session";
  const pct = baseline ? Math.round(((m.participationIndex - baseline) / baseline) * 100) : null;
  const direction =
    pct === null
      ? "no baseline established yet"
      : pct <= -25
      ? `${Math.abs(pct)}% BELOW baseline — participation is declining`
      : pct >= 15
      ? `${pct}% above baseline — participation is improving`
      : `${pct >= 0 ? "+" : ""}${pct}% vs baseline — participation is steady`;
  const base = baseline ? ` vs baseline ${Math.round(baseline)}` : "";
  return `engagement status ${m.status} (${direction}); participation index ${m.participationIndex}${base}; talk ${(m.talkS / 60).toFixed(1)} min, camera ~${m.cameraOnPct}%, presence ${m.presencePct}%`;
}

async function persistTranscript(sessionId: string, patientId: string, profile: string, segments: TranscriptSegment[]) {
  // create a synthetic placeholder track if none exists; never overwrite a real recording URL
  const track = await prisma.mediaTrack.upsert({
    where: { sessionId_patientId: { sessionId, patientId } },
    create: { sessionId, patientId, gcsUri: `synthetic://${profile}` },
    update: {},
  });
  const lowConf = segments.filter((s) => s.confidence != null && s.confidence < 0.6);
  await prisma.transcript.upsert({
    where: { trackId: track.id },
    create: { trackId: track.id, segments, lowConfSpans: lowConf },
    update: { segments, lowConfSpans: lowConf },
  });
}

async function persistIndividualNote(sessionId: string, patientId: string, note: GroundedNote) {
  // Belt to the schema's braces. A note with no sections has no clinical content, but the review UI
  // still renders it as an approvable draft — a clinician could sign an empty record. Fail the
  // session instead: the previous note (if any) is left intact and the run is visibly FAILED,
  // rather than silently replacing real content with nothing.
  if (note.sections.length === 0) {
    throw new Error(`note generation returned no sections for patient ${patientId} — refusing to write an empty note`);
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.individualNote.findUnique({ where: { sessionId_patientId: { sessionId, patientId } }, include: { sections: true } });
    if (existing) {
      await tx.noteClaim.deleteMany({ where: { sectionId: { in: existing.sections.map((s) => s.id) } } });
      await tx.noteSection.deleteMany({ where: { individualNoteId: existing.id } });
      await tx.individualNote.delete({ where: { id: existing.id } });
    }
    await tx.individualNote.create({
      data: {
        sessionId, patientId, status: "DRAFT", templateVer: TEMPLATE_VER,
        goalSignals: note.goalSignals,
        signalAlignment: note.signalAlignment,
        sections: {
          create: note.sections.map((s) => ({
            key: s.key,
            bodyDraft: s.claims.map((c) => c.text).join(" ") || "(no content)",
            claims: { create: s.claims.map((c) => ({ text: c.text, verdict: c.verdict, verifierNote: c.reason, evidence: c.evidence })) },
          })),
        },
      },
    });
  });
}

export type PipelineResult = {
  sessionId: string;
  processed: number;
  notesCreated: number;
  flagsCreated: number;
  groupNote: boolean;
  claimStats: { total: number; supported: number; unsupported: number; uncertain: number };
};

type Enrollment = Awaited<ReturnType<typeof loadSession>>["cohort"]["enrollments"][number];
async function loadSession(sessionId: string) {
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { cohort: { include: { enrollments: { include: { patient: true, goals: true, baseline: true } } } } },
  });
  if (!s) throw new Error("session not found");
  return s;
}

async function runChunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

/** Batch pipeline: transcripts → engagement → grounded notes → group note → risk stub → READY. */
/**
 * Public entry point. Owns the status lifecycle so a failed run can't strand the session.
 *
 * Previously the body set PROCESSING on entry and READY at the end with nothing in between, so any
 * throw left the session in PROCESSING forever — and the live page only offers "Generate notes" for
 * ENDED/FAILED, making it unrecoverable from the UI. Note that a hard request timeout kills the
 * process mid-await and this catch never runs, which is why the live page ALSO treats a stale
 * PROCESSING as retryable; the two fixes cover different failure modes.
 */
export async function processSession(sessionId: string, opts?: { limit?: number }): Promise<PipelineResult> {
  await prisma.session.update({ where: { id: sessionId }, data: { status: "PROCESSING" } });
  try {
    return await runPipeline(sessionId, opts);
  } catch (err) {
    await prisma.session
      .update({ where: { id: sessionId }, data: { status: "FAILED" } })
      .catch(() => {}); // never mask the original failure with a bookkeeping error
    throw err;
  }
}

async function runPipeline(sessionId: string, opts?: { limit?: number }): Promise<PipelineResult> {
  const session = await loadSession(sessionId);

  await recomputeEngagement(sessionId); // real events → metrics; no-op otherwise
  const asr = getAsrProvider();

  const enrollments = opts?.limit ? session.cohort.enrollments.slice(0, opts.limit) : session.cohort.enrollments;
  const attendance = await prisma.attendance.findMany({ where: { sessionId } });
  const present = (pid: string) => attendance.find((a) => a.patientId === pid)?.present ?? true;

  // metric per enrollment (current session, else latest in cohort)
  const metricOf = new Map<string, MetricLite>();
  for (const e of enrollments) {
    let m = await prisma.engagementMetric.findUnique({ where: { sessionId_patientId: { sessionId, patientId: e.patientId } } });
    if (!m) {
      // fall back to the most recent prior metric (sort by session index in JS — reliable)
      const all = await prisma.engagementMetric.findMany({
        where: { patientId: e.patientId, session: { cohortId: session.cohortId } },
        include: { session: { select: { index: true } } },
      });
      all.sort((a, b) => b.session.index - a.session.index);
      m = all[0] ?? null;
    }
    metricOf.set(e.patientId, m ? { participationIndex: m.participationIndex, talkS: m.talkS, cameraOnPct: m.cameraOnPct, presencePct: m.presencePct, status: m.status } : null);
  }
  // one present teen in an attention status gets the risk-triggering transcript (STUB demo)
  const attentionStatuses = new Set(["CHECK_IN", "WATCH", "WORTH_A_LOOK"]);
  const flaggedPatientId = enrollments.find((e) => present(e.patientId) && attentionStatuses.has(metricOf.get(e.patientId)?.status ?? ""))?.patientId ?? null;

  async function processMember(e: Enrollment) {
    const p = e.patient;
    const name = `${p.firstName} ${p.lastName}`;
    const metric = metricOf.get(p.id) ?? null;
    const flagged = p.id === flaggedPatientId;
    const profile = profileForStatus(metric?.status ?? "ESTABLISHING", present(p.id), flagged);
    // transcript source priority: Daily live capture → Deepgram batch on a real recording URL → fixtures
    const existingTrack = await prisma.mediaTrack.findUnique({ where: { sessionId_patientId: { sessionId, patientId: p.id } }, include: { transcript: true } });
    const liveSegs = existingTrack?.gcsUri?.startsWith("daily-live") ? (existingTrack.transcript?.segments as TranscriptSegment[] | undefined) : undefined;
    let segments: TranscriptSegment[];
    if (liveSegs && liveSegs.length) segments = liveSegs;
    else if (asr && isRealAudioUrl(existingTrack?.gcsUri)) segments = await asr.transcribe(existingTrack!.gcsUri);
    else segments = transcriptForProfile(profile);

    await persistTranscript(sessionId, p.id, profile, segments);
    const participationSummary = summarizeParticipation(metric, e.baseline?.participationIndex ?? null);

    const note = await groundedIndividualNote({
      teenName: name, segments,
      goals: [...e.goals].sort((a, b) => a.order - b.order).map((g) => g.text),
      sessionModule: session.module, participationSummary,
    });
    await persistIndividualNote(sessionId, p.id, note);

    await prisma.riskFlag.deleteMany({ where: { sessionId, patientId: p.id } });
    let flags = 0;
    for (const hit of scanForRisk(segments)) {
      await prisma.riskFlag.create({
        data: {
          sessionId, patientId: p.id, category: hit.category, severity: hit.severity,
          evidence: [{ startMs: hit.startMs, endMs: hit.endMs, quote: `${hit.quote}  [SYNTHETIC STUB — not a clinical detection]` }],
          status: "DETECTED", disposition: "NONE", slaDueAt: new Date(Date.now() + 12 * 3600 * 1000),
        },
      });
      flags++;
    }
    return { name, participationSummary, snippet: segments[0]?.text ?? "", summary: note.summary, flags };
  }

  const results = await runChunked(enrollments, CONCURRENCY, processMember);

  const claimStats = { total: 0, supported: 0, unsupported: 0, uncertain: 0 };
  let flagsCreated = 0;
  for (const r of results) {
    claimStats.total += r.summary.total;
    claimStats.supported += r.summary.supported;
    claimStats.unsupported += r.summary.unsupported;
    claimStats.uncertain += r.summary.uncertain;
    flagsCreated += r.flags;
  }

  // group note
  const perTeen = [...results].sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ name: r.name, participationSummary: r.participationSummary, snippet: r.snippet }));
  const group = await generateGroupNote({
    cohortName: session.cohort.name, sessionModule: session.module,
    attendedCount: enrollments.filter((e) => present(e.patientId)).length, rosterCount: enrollments.length, perTeen,
  });
  await prisma.$transaction(async (tx) => {
    const existing = await tx.groupNote.findUnique({ where: { sessionId }, include: { sections: true } });
    if (existing) {
      await tx.noteSection.deleteMany({ where: { groupNoteId: existing.id } });
      await tx.groupNote.delete({ where: { id: existing.id } });
    }
    await tx.groupNote.create({
      data: { sessionId, status: "DRAFT", templateVer: TEMPLATE_VER, goalIndicators: group.goalIndicators, sections: { create: group.sections.map((s) => ({ key: s.key, bodyDraft: s.body })) } },
    });
  });

  await prisma.session.update({ where: { id: sessionId }, data: { status: "READY" } });
  const [org, clinician] = await Promise.all([prisma.org.findFirst({ select: { id: true } }), prisma.clinician.findFirst({ select: { id: true } })]);
  if (org && clinician) {
    await prisma.auditEvent.create({ data: { orgId: org.id, actorId: clinician.id, action: "session.processed", entityType: "Session", entityId: sessionId, meta: { notesCreated: results.length, flagsCreated } } });
  }

  return { sessionId, processed: enrollments.length, notesCreated: results.length, flagsCreated, groupNote: true, claimStats };
}
