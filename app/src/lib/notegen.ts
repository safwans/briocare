import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, NOTE_MODEL, VERIFY_MODEL } from "./ai";

// Grounded note generation. Implements docs/grounding-contract.md:
// generate (each clinical claim cites evidence) → verify each transcript-grounded claim →
// mark verdicts. Metric-grounded claims (Participation) are substantiated by our own engagement
// data (system ground truth), so they're auto-verified. UNSUPPORTED/UNCERTAIN claims block
// approval downstream (see actions.ts gate).

export type TranscriptSegment = { startMs: number; endMs: number; text: string; confidence?: number };
export type NoteGenInput = {
  teenName: string;
  segments: TranscriptSegment[];
  goals: string[];
  sessionModule: string;
  participationSummary: string; // e.g. "PI 15 vs baseline 46 (~67% below); talk 1.2min, camera ~20%"
};

const IND_SECTION_KEYS = ["PRESENTATION_SUBJECTIVE", "PARTICIPATION", "INTERVENTIONS_RESPONSE", "PLAN"] as const;
const GROUP_SECTION_KEYS = ["SESSION_OVERVIEW", "GROUP_PROCESS_THEMES", "FACILITATOR_OBSERVATIONS", "PLAN"] as const;
const GOAL_STATUSES = ["MET", "ON_TRACK", "EMERGING", "DECLINING", "AT_RISK", "OFF_TRACK"] as const;

const EvidenceSpan = z.object({
  kind: z.enum(["transcript", "metric"]).describe("transcript = a quote from this teen's transcript; metric = the behavioral participation summary (system data)"),
  startMs: z.number().describe("start of the cited transcript span in ms (0 for metric evidence)"),
  endMs: z.number().describe("end of the cited span in ms (0 for metric evidence)"),
  quote: z.string().describe("verbatim quote from the transcript span, or the exact metric text for metric evidence"),
});
const Claim = z.object({
  text: z.string().describe("one clinical assertion about the teen"),
  evidence: z.array(EvidenceSpan).describe("evidence substantiating the claim; [] only if none exists"),
});
const Section = z.object({ key: z.enum(IND_SECTION_KEYS), claims: z.array(Claim) });
const GoalSignal = z.object({ goal: z.string(), status: z.enum(GOAL_STATUSES) });
// Whether the subjective narrative and the behavioral signal tell the same story. Structured
// rather than buried in prose, because a clinician skimming the note is exactly who a silent
// contradiction misleads — the review UI raises this as a banner.
const SignalAlignment = z.object({
  status: z
    .enum(["CONSISTENT", "DIVERGENT"])
    .describe(
      "DIVERGENT when how the teen presented in the transcript points a different way than the measured participation (e.g. reads engaged while participation is well below baseline, or reads withdrawn while participation is up). CONSISTENT otherwise, including when there is no participation data to compare against."
    ),
  note: z
    .string()
    .describe(
      "one plain sentence a clinician can read at a glance, naming both sides — what the teen presented like and what the signal shows. Empty string when CONSISTENT."
    ),
});

const IndividualNoteSchema = z.object({
  // .length(4) is load-bearing, not decoration. With a bare z.array() the description below was the
  // ONLY thing asking for four sections, so a degenerate `sections: []` response validated cleanly
  // and produced a note with goal signals, no clinical content, and an enabled "Approve & sign off"
  // button. Constraining the schema makes the SDK reject and retry instead of accepting it.
  sections: z.array(Section).length(4).describe("exactly the four sections, in order"),
  goalSignals: z.array(GoalSignal).describe("one per seeded goal"),
  signalAlignment: SignalAlignment,
});
type GeneratedNote = z.infer<typeof IndividualNoteSchema>;

const VerdictSchema = z.object({ verdict: z.enum(["SUPPORTED", "UNSUPPORTED", "UNCERTAIN"]), reason: z.string() });

export type EvidenceItem = z.infer<typeof EvidenceSpan>;
export type VerifiedClaim = { text: string; evidence: EvidenceItem[]; verdict: "SUPPORTED" | "UNSUPPORTED" | "UNCERTAIN"; reason: string };
export type VerifiedSection = { key: (typeof IND_SECTION_KEYS)[number]; claims: VerifiedClaim[] };
export type SignalAlignment = { status: "CONSISTENT" | "DIVERGENT"; note: string };
export type GroundedNote = {
  sections: VerifiedSection[];
  goalSignals: { goal: string; status: string }[];
  signalAlignment: SignalAlignment;
  summary: { total: number; supported: number; unsupported: number; uncertain: number };
};

function transcriptToText(segments: TranscriptSegment[]): string {
  if (segments.length === 0) return "(no speech captured — teen was silent or absent)";
  // Live capture stores Daily's absolute (epoch-ms) timestamps so that redundant capturers
  // de-duplicate cleanly. Those are 13-digit numbers; rebasing on the first segment keeps the
  // prompt — and therefore the evidence spans the model cites back — readable and session-relative.
  // Nothing joins on these values, so the rebase is display-only.
  const base = Math.min(...segments.map((s) => s.startMs));
  return segments
    .map((s) => {
      const lowConf = s.confidence != null && s.confidence < 0.6 ? " LOW-CONF" : "";
      return `[${s.startMs - base}-${s.endMs - base}${lowConf}] ${s.text}`;
    })
    .join("\n");
}

const GEN_SYSTEM = `You are a clinical documentation assistant drafting an IOP group-therapy progress note for ONE adolescent, from that teen's own session transcript. Rules:
- Every clinical claim MUST be grounded. Transcript-derived claims cite transcript spans (kind "transcript", exact startMs/endMs + verbatim quote). Participation claims about behavioral metrics (talk time, camera, participation index) cite the provided participation summary as evidence with kind "metric".
- Do NOT invent content. If the transcript doesn't support a section (e.g. the teen was silent/absent), say so explicitly as a claim with empty evidence.
- Use ONLY this teen's transcript for what they said. Never generalize from the group.
- The Participation section reports the behavioral proxy (metric evidence). It stays a proxy — low participation is not itself a clinical conclusion about how the teen is doing.
- RECONCILE THE TWO. The behavioral signal is measured data about this same session, not optional background. The subjective narrative must not contradict it silently. If the transcript reads warm or forthcoming while the signal shows participation well below baseline, say both in the same breath — e.g. "spoke more openly than in recent sessions, though measured participation was 67% below baseline". Never let a clinician skim the narrative and come away with the opposite impression from the signal.
- Do not swing the other way either: a low signal does not license describing a teen as disengaged or deteriorating if the transcript doesn't show it. Report the tension, don't resolve it by picking a side.
- Set signalAlignment to DIVERGENT whenever the two point different ways, with one sentence naming both. This is what the reviewer sees first.
- Produce exactly four sections in order: Presentation & subjective, Participation, Interventions & response, Plan. Concise, clinically appropriate.`;

export async function generateIndividualNote(input: NoteGenInput): Promise<GeneratedNote> {
  const userPrompt = `Teen: ${input.teenName}
Session module: ${input.sessionModule}
Treatment-plan goals: ${input.goals.map((g, i) => `${i + 1}. ${g}`).join("  ")}
Measured participation this session (behavioral signal — reconcile your narrative with this): ${input.participationSummary}

Transcript (each line: [startMs-endMs] text):
${transcriptToText(input.segments)}

Draft the four-section note, one goal-progress signal per goal, and the signalAlignment verdict. Cite evidence for every clinical claim.`;

  const res = await anthropic.messages.parse({
    model: NOTE_MODEL,
    max_tokens: 16000,
    system: GEN_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(IndividualNoteSchema) },
  });
  if (!res.parsed_output) throw new Error("note generation returned no structured output");
  return res.parsed_output;
}

const VERIFY_SYSTEM = `You verify whether a single clinical claim is substantiated by the evidence cited for it: transcript quotes, and where the claim also cites measured participation data, that data too. You see ONLY the claim and its evidence. Measured participation data is system ground truth — a claim that accurately reflects it is substantiated by it. Be conservative: if the quotes do not clearly substantiate the claim, or support is partial/ambiguous, do NOT return SUPPORTED. Return UNSUPPORTED when the quotes don't substantiate the claim, UNCERTAIN when support is partial or a cited span is low-confidence. Recall of ungrounded claims matters more than precision.`;

async function verifyClaim(text: string, evidence: EvidenceItem[]): Promise<{ verdict: "SUPPORTED" | "UNSUPPORTED" | "UNCERTAIN"; reason: string }> {
  if (evidence.length === 0) return { verdict: "UNSUPPORTED", reason: "no evidence cited" };
  const transcriptQuotes = evidence.filter((e) => e.kind === "transcript").map((e) => e.quote);
  // Metric-only claims are substantiated by our own engagement data (system ground truth).
  if (transcriptQuotes.length === 0) return { verdict: "SUPPORTED", reason: "grounded in engagement metrics (system data)" };
  // A reconciled claim ("warm, though talk time was well below baseline") cites the transcript AND
  // the metric. Judging it on the transcript alone marks the metric half unsupported — penalising
  // exactly the sentences that reconcile narrative with signal. Show the verifier both.
  const metricQuotes = evidence.filter((e) => e.kind === "metric").map((e) => e.quote);
  const metricBlock = metricQuotes.length
    ? `\n\nCited measured participation data (system ground truth — treat as fact):\n${metricQuotes.map((q) => `- ${q}`).join("\n")}`
    : "";
  const res = await anthropic.messages.parse({
    model: VERIFY_MODEL,
    max_tokens: 1024,
    system: VERIFY_SYSTEM,
    messages: [{ role: "user", content: `Claim: ${text}\n\nCited transcript quotes:\n${transcriptQuotes.map((q) => `- "${q}"`).join("\n")}${metricBlock}\n\nIs the claim substantiated?` }],
    output_config: { format: zodOutputFormat(VerdictSchema) },
  });
  return res.parsed_output ?? { verdict: "UNCERTAIN", reason: "verifier returned no output" };
}

/** Full grounded pipeline for an individual note: generate → verify → verdicts + summary. */
export async function groundedIndividualNote(input: NoteGenInput): Promise<GroundedNote> {
  const draft = await generateIndividualNote(input);
  const sections: VerifiedSection[] = await Promise.all(
    draft.sections.map(async (s) => ({
      key: s.key,
      claims: await Promise.all(
        s.claims.map(async (c) => {
          const v = await verifyClaim(c.text, c.evidence);
          return { text: c.text, evidence: c.evidence, verdict: v.verdict, reason: v.reason };
        })
      ),
    }))
  );
  const all = sections.flatMap((s) => s.claims);
  return {
    sections,
    goalSignals: draft.goalSignals,
    signalAlignment: draft.signalAlignment,
    summary: {
      total: all.length,
      supported: all.filter((c) => c.verdict === "SUPPORTED").length,
      unsupported: all.filter((c) => c.verdict === "UNSUPPORTED").length,
      uncertain: all.filter((c) => c.verdict === "UNCERTAIN").length,
    },
  };
}

// ---- Group note (aggregate prose; individual notes carry the claim-level grounding rigor) ----

const GroupSection = z.object({ key: z.enum(GROUP_SECTION_KEYS), body: z.string() });
const GroupIndicator = z.object({ label: z.string(), status: z.enum(GOAL_STATUSES) });
const GroupNoteSchema = z.object({
  // Same empty-array gap as IndividualNoteSchema — constrain the shape, don't just describe it.
  sections: z.array(GroupSection).length(4).describe("exactly four sections in order"),
  goalIndicators: z.array(GroupIndicator).describe("two cohort-level indicators"),
});
export type GroupNoteDraft = z.infer<typeof GroupNoteSchema>;

export type GroupGenInput = {
  cohortName: string;
  sessionModule: string;
  attendedCount: number;
  rosterCount: number;
  perTeen: { name: string; participationSummary: string; snippet: string }[];
};

export async function generateGroupNote(input: GroupGenInput): Promise<GroupNoteDraft> {
  const roster = input.perTeen
    .map((t) => `- ${t.name}: ${t.participationSummary}${t.snippet ? ` — e.g. "${t.snippet}"` : ""}`)
    .join("\n");
  const res = await anthropic.messages.parse({
    model: NOTE_MODEL,
    max_tokens: 8000,
    system: `You draft a group progress note for an IOP adolescent therapy session. Summarize at the group level from the per-teen inputs provided — do not fabricate specifics not present. Four sections: Session overview, Group process & themes, Facilitator observations, Plan. Plus two cohort-level goal indicators.`,
    messages: [{ role: "user", content: `Cohort: ${input.cohortName}\nModule: ${input.sessionModule}\nAttendance: ${input.attendedCount}/${input.rosterCount}\n\nPer-teen:\n${roster}\n\nDraft the four-section group note and two indicators.` }],
    output_config: { format: zodOutputFormat(GroupNoteSchema) },
  });
  if (!res.parsed_output) throw new Error("group note generation returned no structured output");
  return res.parsed_output;
}
