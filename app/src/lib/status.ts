// Engagement status display metadata — matches the mocks + docs/engagement-spec.md.
// The internal CHECK_IN key renders as "Check in"; display never uses the words "at risk".

export type EngagementStatus =
  | "ESTABLISHING" | "CHECK_IN" | "WORTH_A_LOOK" | "WATCH" | "STABLE" | "IMPROVING" | "ABSENT";

export type BucketKey = "falling" | "watch" | "stable";

export const STATUS_META: Record<
  EngagementStatus,
  { label: string; color: string; bg: string; bucket: BucketKey }
> = {
  CHECK_IN:     { label: "Check in",              color: "#b8556a", bg: "#fbeef1", bucket: "falling" },
  WATCH:        { label: "Worth a look",          color: "#b06a1e", bg: "#fbf1e3", bucket: "watch" },
  WORTH_A_LOOK: { label: "Worth a look",          color: "#b06a1e", bg: "#fbf1e3", bucket: "watch" },
  IMPROVING:    { label: "Improving",             color: "#2f8f6f", bg: "#e7f4ee", bucket: "stable" },
  STABLE:       { label: "Stable",                color: "#2f7a86", bg: "#e7f2f2", bucket: "stable" },
  ESTABLISHING: { label: "Establishing baseline", color: "#6d828a", bg: "#eef2f3", bucket: "stable" },
  // Bucketed with "falling" on purpose: a teen who didn't turn up is the clearest retention signal
  // there is, and burying them under "stable" is exactly how a quiet drop-out goes unnoticed.
  ABSENT:       { label: "Absent",                color: "#8a5a9c", bg: "#f3ecf7", bucket: "falling" },
};

export const BUCKETS: { key: BucketKey; title: string; color: string }[] = [
  { key: "falling", title: "Falling vs. baseline", color: "#b8556a" },
  { key: "watch",   title: "Worth a look",         color: "#c2883a" },
  { key: "stable",  title: "Stable or improving",  color: "#3f9a7d" },
];

/** delta of latest PI vs anchored baseline (mean of first 3), as a signed fraction. */
export function deltaPct(trend: number[]): number | null {
  if (trend.length < 3) return null;
  const base = trend.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  if (base === 0) return null;
  return (trend[trend.length - 1] - base) / base;
}
