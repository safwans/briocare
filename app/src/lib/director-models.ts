// Models the AI-patient turn director can run on, and how each one's request must be shaped.
//
// The list is not "every Claude model". The director uses structured outputs (messages.parse +
// a zod schema), which Opus 4.7 and 4.6 don't support — they'd fail outright. Of the ones that do,
// two need different parameters, and getting those wrong is a 400 rather than a degraded answer:
//
//   - Haiku 4.5 rejects `effort` entirely, and predates the adaptive-thinking config.
//   - Fable 5 has thinking permanently on; an explicit `thinking: {type:"disabled"}` is rejected.
//
// Everything else takes `thinking: disabled` + `effort: low`, which is what keeps a turn quick
// enough to feel like conversation.

export type DirectorModel = {
  id: string;
  label: string;
  price: string;
  note: string;
  /** "disable" sends thinking:{type:"disabled"}; "omit" leaves the parameter off entirely. */
  thinking: "disable" | "omit";
  /** Whether output_config.effort may be sent at all. */
  effort: boolean;
};

export const DIRECTOR_MODELS: DirectorModel[] = [
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    price: "$1 / $5 per MTok",
    note: "Fastest and cheapest. Snappiest turn-taking; personas can read flatter.",
    thinking: "omit",
    effort: false,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    price: "$3 / $15 per MTok",
    note: "Default. Good persona fidelity at conversational latency.",
    thinking: "disable",
    effort: true,
  },
  {
    id: "claude-opus-4-8",
    label: "Opus 4.8",
    price: "$5 / $25 per MTok",
    note: "Richer in-character writing, a beat slower to answer.",
    thinking: "disable",
    effort: true,
  },
  {
    id: "claude-opus-5",
    label: "Opus 5",
    price: "$5 / $25 per MTok",
    note: "Strongest read of the room; slowest of the practical options.",
    thinking: "disable",
    effort: true,
  },
  {
    id: "claude-fable-5",
    label: "Fable 5",
    price: "$10 / $50 per MTok",
    note: "Most capable overall, but thinking can't be turned off — expect noticeably longer pauses.",
    thinking: "omit",
    effort: true,
  },
];

export const DEFAULT_DIRECTOR_MODEL = "claude-sonnet-5";

export function directorModel(id: string | undefined): DirectorModel {
  return DIRECTOR_MODELS.find((m) => m.id === id) ?? DIRECTOR_MODELS.find((m) => m.id === DEFAULT_DIRECTOR_MODEL)!;
}
