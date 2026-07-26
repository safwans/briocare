import "dotenv/config";
import { getAsrProvider } from "../src/lib/asr";

// Verifies the Deepgram provider against a real public audio sample (no PHI).
(async () => {
  const asr = getAsrProvider();
  if (!asr) throw new Error("no ASR provider (set DEEPGRAM_API_KEY)");
  const url = "https://dpgr.am/spacewalk.wav"; // Deepgram's public sample clip
  console.log("Transcribing", url, "…");
  const t0 = Date.now();
  const segments = await asr.transcribe(url);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${segments.length} segments\n`);
  for (const s of segments.slice(0, 5)) {
    console.log(`[${(s.startMs / 1000).toFixed(1)}s-${(s.endMs / 1000).toFixed(1)}s conf ${s.confidence?.toFixed(2)}] ${s.text}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
