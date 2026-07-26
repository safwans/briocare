import "dotenv/config";
import { groundedIndividualNote } from "../src/lib/notegen";

// Synthetic transcript for one teen (no real PHI). Tests generate → verify → gate.
const segments = [
  { startMs: 12000, endMs: 19000, text: "Um, I guess this week was kind of hard. I didn't really want to come today." },
  { startMs: 40000, endMs: 58000, text: "Yeah, I tried the breathing thing once before the math test. It sort of helped, I think." },
  { startMs: 90000, endMs: 96000, text: "I don't know. Maybe.", confidence: 0.45 },
];

(async () => {
  const note = await groundedIndividualNote({
    teenName: "Priya",
    segments,
    goals: ["Tolerate speaking in group", "Apply a coping skill in vivo"],
    sessionModule: "Cognitive restructuring",
    participationSummary: "PI 42 vs baseline 45 (~7% below); talk 3.7 min, camera on, full attendance",
  });

  console.log("SUMMARY:", note.summary);
  for (const s of note.sections) {
    console.log(`\n## ${s.key}`);
    for (const c of s.claims) {
      console.log(`  [${c.verdict}] ${c.text}`);
      for (const e of c.evidence) console.log(`      ↳ "${e.quote}"`);
      if (c.verdict !== "SUPPORTED") console.log(`      reason: ${c.reason}`);
    }
  }
  console.log("\nGOAL SIGNALS:", JSON.stringify(note.goalSignals));
})().catch((e) => { console.error(e); process.exit(1); });
