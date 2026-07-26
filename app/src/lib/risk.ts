import type { TranscriptSegment } from "./notegen";

// ⚠️ STUB — NOT a clinical detector. Real self-harm detection requires a clinical/legal risk
// taxonomy that does not exist yet; writing it is blocked on the clinical co-founder, not on
// engineering, so there is deliberately no spec in docs/ to point at. This is a simple,
// clearly-labeled phrase scanner that exercises the flag → disposition → approval-gate workflow
// on test data. Tuned for high recall (broad phrases), never presented as a real assessment.

export type RiskHit = {
  category: "SELF_HARM_SI";
  severity: "ACUTE" | "ELEVATED";
  startMs: number;
  endMs: number;
  quote: string;
};

const INDICATORS: { pattern: RegExp; severity: "ACUTE" | "ELEVATED" }[] = [
  { pattern: /can'?t keep going|kill myself|end it all|hurt myself|cut myself|don'?t want to be here|better off (dead|gone)|suicid/i, severity: "ACUTE" },
  { pattern: /hopeless|worthless|hate myself|give up|no point/i, severity: "ELEVATED" },
];

/** Scan a teen's transcript for self-harm indicator phrases (STUB). One hit per matching segment. */
export function scanForRisk(segments: TranscriptSegment[]): RiskHit[] {
  const hits: RiskHit[] = [];
  for (const s of segments) {
    for (const ind of INDICATORS) {
      if (ind.pattern.test(s.text)) {
        hits.push({ category: "SELF_HARM_SI", severity: ind.severity, startMs: s.startMs, endMs: s.endMs, quote: s.text });
        break;
      }
    }
  }
  return hits;
}
