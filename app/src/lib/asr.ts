import type { TranscriptSegment } from "./notegen";

// ASR provider port (docs/cpaas-integration.md → Slice 5). Real per-track audio → transcript.
// A real recording URL (Daily egress / GCS) is transcribed here; test-data runs with no real
// recording fall back to synthetic fixtures in the pipeline. Kept behind this interface so the
// pipeline never changes when the provider lands.

export interface AsrProvider {
  transcribe(audioUrl: string): Promise<TranscriptSegment[]>;
}

type DeepgramUtterance = { start: number; end: number; transcript: string; confidence: number };
type DeepgramWord = { start: number; end: number; punctuated_word?: string; word: string; confidence: number };

class DeepgramProvider implements AsrProvider {
  constructor(private apiKey: string) {}

  async transcribe(audioUrl: string): Promise<TranscriptSegment[]> {
    // Batch transcription of a remote audio URL. Per-participant near-field single-speaker track →
    // "easy" ASR (no diarization). utterances=true gives us natural, timestamped segments.
    const params = new URLSearchParams({ model: "nova-2", smart_format: "true", punctuate: "true", utterances: "true" });
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: audioUrl }),
    });
    if (!res.ok) throw new Error(`Deepgram error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      results?: {
        utterances?: DeepgramUtterance[];
        channels?: { alternatives?: { words?: DeepgramWord[] }[] }[];
      };
    };

    const utts = data.results?.utterances;
    if (utts && utts.length) {
      return utts
        .filter((u) => u.transcript.trim().length > 0)
        .map((u) => ({ startMs: Math.round(u.start * 1000), endMs: Math.round(u.end * 1000), text: u.transcript.trim(), confidence: u.confidence }));
    }
    // fallback: stitch words into one segment
    const words = data.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    if (words.length === 0) return [];
    return [{
      startMs: Math.round(words[0].start * 1000),
      endMs: Math.round(words[words.length - 1].end * 1000),
      text: words.map((w) => w.punctuated_word ?? w.word).join(" "),
      confidence: words.reduce((a, w) => a + w.confidence, 0) / words.length,
    }];
  }
}

// STT mode (docs/cpaas-integration.md). "daily" = live transcription captured during the call
// (Deepgram-powered, per-participant, no recording plumbing); "deepgram" = batch on the recorded
// per-track audio after the session. Both ultimately use Deepgram. Default: daily (live).
export type AsrMode = "daily" | "deepgram";
export function asrMode(): AsrMode {
  return process.env.ASR_PROVIDER === "deepgram" ? "deepgram" : "daily";
}

/** Batch provider for the deepgram mode. In daily mode transcripts arrive live, so this is null. */
export function getAsrProvider(): AsrProvider | null {
  if (asrMode() === "daily") return null;
  if (process.env.DEEPGRAM_API_KEY) return new DeepgramProvider(process.env.DEEPGRAM_API_KEY);
  return null; // no provider → pipeline uses synthetic transcripts for test data
}

/** True for a real, fetchable recording URL (vs the synthetic:// placeholders used in test data). */
export function isRealAudioUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//.test(url);
}
