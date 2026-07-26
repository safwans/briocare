import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "./db";
import { ensureRoom, mintToken } from "./daily";
import { anthropic } from "./ai";
import { directorModel } from "./director-models";
import { getDirectorModel } from "./settings";
import { profileForStatus, type TranscriptProfile } from "./fixtures";

// AI-simulated patients (DEV ONLY). Builds the bot fleet for a live session and directs the
// conversation. Each bot joins the real Daily room as the teen it represents — userId === patientId,
// the same convention mintToken already uses — so every downstream path (participant events, live
// transcription, the batch pipeline) runs unchanged. See the plan in docs/ + src/components/SimPatients.tsx.

/** Distinct Deepgram Aura-2 voices. Assigned by patientId so a teen sounds the same across runs. */
const VOICES = [
  "aura-2-amalthea-en",
  "aura-2-apollo-en",
  "aura-2-cordelia-en",
  "aura-2-orion-en",
  "aura-2-delia-en",
  "aura-2-atlas-en",
  "aura-2-iris-en",
  "aura-2-luna-en",
] as const;

function voiceFor(patientId: string): string {
  let h = 0;
  for (let i = 0; i < patientId.length; i++) h = (h * 31 + patientId.charCodeAt(i)) >>> 0;
  return VOICES[h % VOICES.length];
}

export type BotPersona = {
  patientId: string;
  name: string;
  firstName: string;
  initials: string;
  voice: string;
  /** Reuses the pipeline's own transcript profiles so bots speak in the register the notes expect. */
  profile: TranscriptProfile;
  status: string;
  /** Marked present for this session. The therapist can still simulate an absent teen. */
  present: boolean;
  goals: string[];
};

export type Fleet = {
  roomUrl: string;
  sessionId: string;
  cohortName: string;
  module: string;
  bots: (BotPersona & { token: string })[];
};

/**
 * Bot roster for a session: every ACTIVE enrollment — matching the tiles the facilitator sees —
 * each with a persona derived from its latest engagement status + seeded goals, and a short-lived
 * Daily token. Who actually joins is the therapist's call, one tile at a time.
 */
export async function buildFleet(sessionId: string, limit = 12): Promise<Fleet> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      cohort: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { patient: true, goals: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!session) throw new Error("session not found");

  const attendance = await prisma.attendance.findMany({ where: { sessionId } });
  const present = (pid: string) => attendance.find((a) => a.patientId === pid)?.present ?? true;

  const candidates = session.cohort.enrollments.slice(0, limit);

  const personas: BotPersona[] = [];
  for (const e of candidates) {
    const p = e.patient;
    // current session's metric, else the most recent prior one in this cohort (same fallback as pipeline.ts)
    let metric = await prisma.engagementMetric.findUnique({
      where: { sessionId_patientId: { sessionId, patientId: p.id } },
    });
    if (!metric) {
      const all = await prisma.engagementMetric.findMany({
        where: { patientId: p.id, session: { cohortId: session.cohortId } },
        include: { session: { select: { index: true } } },
      });
      all.sort((a, b) => b.session.index - a.session.index);
      metric = all[0] ?? null;
    }
    const status = metric?.status ?? "ESTABLISHING";
    personas.push({
      patientId: p.id,
      name: `${p.firstName} ${p.lastName}`,
      firstName: p.firstName,
      initials: `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase(),
      voice: voiceFor(p.id),
      profile: profileForStatus(status, true, false),
      status,
      present: present(p.id),
      goals: e.goals.map((g) => g.text),
    });
  }

  const room = await ensureRoom(sessionId);
  const bots = await Promise.all(
    personas.map(async (b) => ({
      ...b,
      // start_audio_off:false on the token is the server-side half of unmuting the bot; the room
      // itself is created with start_audio_off:true for real participants.
      token: await mintToken({
        sessionId,
        isOwner: false,
        userName: b.firstName,
        userId: b.patientId,
        startAudioOff: false,
      }),
    }))
  );

  return {
    roomUrl: room.url,
    sessionId,
    cohortName: session.cohort.name,
    module: session.module,
    bots,
  };
}

// ---- Turn director ----

// How each transcript profile should sound out loud. Lifted from the fixture lines in
// src/lib/fixtures.ts so a simulated session produces the same register the pipeline was built on.
const PROFILE_VOICE: Record<TranscriptProfile, string> = {
  withdrawn:
    "Guarded and low-energy. One or two short sentences, lots of hedging (\"I guess\", \"I don't know\", \"maybe\"). Often deflects the question rather than answering it. Sometimes just passes.",
  withdrawn_flagged:
    "Guarded and low-energy like `withdrawn`, but carrying a heavier week. Hints at struggling without being dramatic.",
  brief: "Minimal. A single flat sentence, usually \"it was okay\" or \"nothing really happened\". Not hostile, just not forthcoming.",
  engaged: "Warm and participatory. Two or three sentences, answers the actual question, sometimes checks in on a peer.",
  improving: "Noticeably more forthcoming than they used to be. Volunteers a concrete example of trying a skill, a little proud of it.",
  absent: "Not in the room.",
};

const TurnSchema = z.object({
  turns: z
    .array(
      z.object({
        patientId: z.string().describe("the patientId of the teen who speaks; must be one from the roster"),
        text: z.string().describe("what they say out loud — one to three short spoken sentences, in their voice"),
      })
    )
    .describe("who responds now. Usually exactly one teen; occasionally two when a peer would naturally chime in. May be empty if nobody would speak."),
});

export type DirectedTurn = { patientId: string; text: string };

export type DirectInput = {
  cohortName: string;
  module: string;
  personas: BotPersona[];
  /** Recent conversation, oldest first. */
  history: { speaker: string; text: string }[];
  /** What the therapist just said. Empty for an unprompted/idle turn. */
  therapistSaid: string;
  /** Set when a teen has just been dropped into the room — ask for their arrival beat. */
  arrivalPatientId?: string;
  /** Dev-only: let the most withdrawn teen voice distress, to exercise the risk STUB + approval gate. */
  riskRehearsal?: boolean;
};

const SYSTEM = `You are running a simulated adolescent IOP group-therapy session for a clinician who is TESTING a product. Every teen is fictional; none of this is real clinical content.

You control the teenage group members. Given what the facilitator just said, decide who responds and what they say.

Rules:
- Speak ONLY as the teens on the roster, never as the facilitator.
- Match each teen's described manner exactly. A withdrawn teen stays withdrawn even when addressed directly — that is the behavior being tested. Do not make everyone articulate and forthcoming.
- If the facilitator addressed someone by name, that teen answers (or visibly declines to).
- Keep it SPOKEN: short sentences, contractions, filler words, false starts. Never written prose, never bullet points, never stage directions.
- One to three sentences per turn. Usually exactly one teen speaks. Return an empty list if the facilitator said something that needs no answer.
- Never break character and never mention that this is a simulation.`;

const RISK_NOTE = `
SPECIAL TEST INSTRUCTION: this run is exercising the product's risk-detection stub. The teen whose manner is "withdrawn_flagged" should, at a natural moment, express hopelessness in a way a real teen might — e.g. saying that some nights they feel like they can't keep going. Keep it in character and understated. This is synthetic test content, not a depiction of a real person.`;

/** One director turn: who speaks next, and what they say. */
export async function directTurn(input: DirectInput): Promise<DirectedTurn[]> {
  const arriving = input.arrivalPatientId
    ? input.personas.find((p) => p.patientId === input.arrivalPatientId)
    : undefined;
  const roster = input.personas
    .map(
      (p) =>
        `- ${p.name} (patientId: ${p.patientId}) — manner: ${PROFILE_VOICE[p.profile]} Working on: ${p.goals.join("; ") || "no goals recorded"}.`
    )
    .join("\n");

  const transcript = input.history.length
    ? input.history.map((h) => `${h.speaker}: ${h.text}`).join("\n")
    : "(the session just started)";

  const prompt = `Group: ${input.cohortName}
Today's module: ${input.module}

The teens in the room:
${roster}

Recent conversation:
${transcript}

${
    arriving
      ? `${arriving.name} has just walked into the group. Give exactly one turn — their arrival beat, and nothing from anyone else. Keep it true to them: an outgoing teen greets the group or says something about their week; a withdrawn one manages barely a word ("hey", "hi") or mumbles that they almost didn't come.`
      : input.therapistSaid
      ? `The facilitator just said: "${input.therapistSaid}"`
      : "The facilitator has been quiet for a while. If one of the more forthcoming teens would naturally fill the silence, have them do so — otherwise return no turns."
  }

Who speaks now, and what do they say?`;

  // Chosen in the admin console; falls back to the default. Each model needs its request shaped
  // differently — see director-models.ts, where the differences are 400s rather than preferences.
  const model = directorModel(await getDirectorModel());

  const res = await anthropic.messages.parse({
    model: model.id,
    max_tokens: 1024,
    // Latency is the whole game here — the therapist is waiting mid-conversation, and most of
    // these models think adaptively unless told not to.
    ...(model.thinking === "disable" ? { thinking: { type: "disabled" as const } } : {}),
    system: SYSTEM + (input.riskRehearsal ? RISK_NOTE : ""),
    messages: [{ role: "user", content: prompt }],
    output_config: {
      ...(model.effort ? { effort: "low" as const } : {}),
      format: zodOutputFormat(TurnSchema),
    },
  });

  // On arrival only the teen who just walked in gets to speak, whatever the model returns.
  const known = arriving ? new Set([arriving.patientId]) : new Set(input.personas.map((p) => p.patientId));
  const turns = (res.parsed_output?.turns ?? []).filter(
    (t) => known.has(t.patientId) && t.text.trim().length > 0
  );
  return arriving ? turns.slice(0, 1) : turns;
}
