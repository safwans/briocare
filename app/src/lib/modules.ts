// Session curriculum modules, shared by the seeder and by the runtime scheduler in actions.ts.
// Keeping the module coherent with the program focus avoids e.g. a Social-Anxiety cohort showing a
// "Behavioral activation" module.

export type ProgramFocusKey = "SOCIAL_ANXIETY" | "MOOD_DEPRESSION" | "EMOTION_REGULATION";

export const MODULES_BY_FOCUS: Record<ProgramFocusKey, string[]> = {
  SOCIAL_ANXIETY: ["Cognitive restructuring", "Exposure practice", "Relapse prevention"],
  MOOD_DEPRESSION: ["Behavioral activation", "Cognitive restructuring", "Relapse prevention"],
  EMOTION_REGULATION: ["Emotion regulation skills", "Distress tolerance", "Mindfulness practice"],
};

/** Next module in the focus's rotation — advances past `current` so sessions don't repeat back to back. */
export function nextModule(focus: string, current?: string | null): string {
  const list = MODULES_BY_FOCUS[focus as ProgramFocusKey] ?? MODULES_BY_FOCUS.SOCIAL_ANXIETY;
  const at = current ? list.indexOf(current) : -1;
  return list[(at + 1) % list.length];
}
