import Tooltip from "./Tooltip";
import { STATUS_META, type EngagementStatus } from "@/lib/status";

export function focusLabel(f: string): string {
  return (
    {
      SOCIAL_ANXIETY: "Social Anxiety",
      MOOD_DEPRESSION: "Mood & Depression",
      EMOTION_REGULATION: "Emotion Regulation",
    } as Record<string, string>
  )[f] ?? f;
}

export function StatusChip({ status }: { status: EngagementStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      style={{ color: m.color, background: m.bg }}
      className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
    >
      {m.label}
    </span>
  );
}

/** Tiny server-rendered SVG sparkline from a numeric trend. */
export function Sparkline({ trend, color = "#8093a0" }: { trend: number[]; color?: string }) {
  const w = 92, h = 26, pad = 3;
  if (trend.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min || 1;
  const pts = trend
    .map((v, i) => {
      const x = pad + (i / (trend.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = w - pad;
  const lastY = pad + (1 - (trend[trend.length - 1] - min) / range) * (h - 2 * pad);
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={2.2} fill={color} />
    </svg>
  );
}

/**
 * Plain-language definitions for the engagement numbers, keyed by the label the UI renders.
 * The therapist sees "Participation index 62" with no way to know what feeds it or how it is
 * scaled — these tooltips are the answer, and they mirror the weights and soft caps in
 * docs/engagement-spec.md (src/lib/engagement.ts). Keep them in sync with WEIGHT/SOFTCAP.
 */
export const METRIC_HELP: Record<string, string> = {
  "Participation index":
    "0–100 composite of this member's own session telemetry: talk time (35%), speaking turns (25%), camera on (15%), presence (15%), chat (10%). Each input is capped before weighting — 8 minutes of talk, 10 turns, 10 chat messages — so a member who dominates the room can't score above one who simply took part.",
  "Talk time": "Seconds this member's microphone was the active speaker. Caps at 8 minutes for scoring.",
  "Speaking turns": "Number of separate times the member started speaking after someone else. Counts distinct contributions, not length — caps at 10 for scoring.",
  "Camera on": "Percentage of the time they were in the room with their camera on — measured against their presence, not the whole session, so leaving early doesn't read as camera-off.",
  "Presence": "Percentage of the session's actual running time they were joined to the room, summed across joins and leaves.",
  "Chat count": "Messages sent in session chat. Caps at 10 for scoring; weighted lowest because it's the easiest signal to game.",
  "Vs. baseline":
    "Change in participation index against this member's own baseline from their first sessions — not against the rest of the group. A quiet teen who stays quiet reads as stable; a talkative one who goes quiet is what this surfaces. Sessions they missed are left out of both sides: not showing up is an attendance problem, not a participation one, and it's reported separately.",
  "Participation trend": "Participation index across the sessions this member attended, oldest to most recent. Missed sessions are skipped rather than plotted as zero, so a dip means they were quieter — not that they were away.",
};

/** A label with its definition on hover, marked with an ⓘ so it reads as hoverable. */
export function HelpLabel({ label, help, className = "" }: { label: string; help?: string; className?: string }) {
  const text = help ?? METRIC_HELP[label];
  if (!text) return <span className={className}>{label}</span>;
  return <Tooltip label={label} help={text} className={className} />;
}
