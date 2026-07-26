import type { TranscriptSegment } from "./notegen";

// Synthetic per-participant transcripts for TEST-DATA pipeline runs (no real PHI, no real audio).
// Real audio → transcript comes from the ASR provider (src/lib/asr.ts) once a Deepgram/AssemblyAI
// key is configured. These fixtures let the whole pipeline run end-to-end without one.

export type TranscriptProfile = "withdrawn" | "withdrawn_flagged" | "engaged" | "improving" | "brief" | "absent";

const PROFILES: Record<TranscriptProfile, TranscriptSegment[]> = {
  absent: [],
  withdrawn: [
    { startMs: 12000, endMs: 19000, text: "Um, I guess this week was kind of hard. I didn't really want to come today." },
    { startMs: 88000, endMs: 94000, text: "I don't know. Maybe.", confidence: 0.44 },
  ],
  // NOTE: contains a SYNTHETIC self-harm indicator phrase purely to exercise the risk STUB. Not real.
  withdrawn_flagged: [
    { startMs: 15000, endMs: 24000, text: "Honestly it's been a rough week. Some nights I feel like I can't keep going." },
    { startMs: 91000, endMs: 96000, text: "I dunno. Whatever.", confidence: 0.41 },
  ],
  brief: [
    { startMs: 20000, endMs: 27000, text: "It was okay I guess. Nothing really happened this week." },
  ],
  engaged: [
    { startMs: 10000, endMs: 21000, text: "This week actually went okay. I hung out with a friend on Saturday which was nice." },
    { startMs: 60000, endMs: 72000, text: "I wanted to check in on Maya, she seemed kind of down last time." },
  ],
  improving: [
    { startMs: 14000, endMs: 22000, text: "I tried the breathing thing before my presentation and it actually helped a lot." },
    { startMs: 55000, endMs: 66000, text: "I even raised my hand in class once this week, which is huge for me." },
  ],
};

export function transcriptForProfile(profile: TranscriptProfile): TranscriptSegment[] {
  return PROFILES[profile].map((s) => ({ ...s }));
}

/** Pick a transcript profile from a member's engagement status (test data only). */
export function profileForStatus(status: string, present: boolean, flagged: boolean): TranscriptProfile {
  if (!present) return "absent";
  if (flagged) return "withdrawn_flagged";
  switch (status) {
    case "CHECK_IN": return "withdrawn";
    case "WATCH":
    case "WORTH_A_LOOK": return "brief";
    case "IMPROVING": return "improving";
    default: return "engaged";
  }
}
