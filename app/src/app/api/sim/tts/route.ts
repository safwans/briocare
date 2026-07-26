import { NextRequest } from "next/server";
import { simEnabled } from "@/lib/sim";

// Text-to-speech proxy for the AI patients — keeps DEEPGRAM_API_KEY server-side.
//
// Returns RAW PCM, not WAV, on purpose. Deepgram streams `container=wav` with a placeholder
// length in the RIFF header (2147418112 bytes against a ~150KB payload), because the total isn't
// known when the header is written. Chrome's decodeAudioData accepts that header and hands back a
// buffer that never fires `onended` and carries no audio — the bots publish silence and never stop
// "speaking". Raw linear16 + a hand-built AudioBuffer is deterministic and gives us the exact
// duration up front.

const FALLBACK_VOICE = "aura-2-thalia-en";
const SAMPLE_RATE = 24000;

async function speak(text: string, voice: string): Promise<Response> {
  const params = new URLSearchParams({
    model: voice,
    encoding: "linear16",
    container: "none",
    sample_rate: String(SAMPLE_RATE),
  });
  return fetch(`https://api.deepgram.com/v1/speak?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

export async function POST(req: NextRequest) {
  if (!simEnabled()) return new Response(null, { status: 404 });
  if (!process.env.DEEPGRAM_API_KEY) {
    return Response.json({ error: "DEEPGRAM_API_KEY is not set" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string };
  const text = (body.text ?? "").trim();
  if (!text) return Response.json({ error: "no text" }, { status: 400 });

  let res = await speak(text, body.voice || FALLBACK_VOICE);
  // A voice id Deepgram doesn't recognize would otherwise leave that bot permanently mute.
  if (!res.ok && body.voice && body.voice !== FALLBACK_VOICE) {
    res = await speak(text, FALLBACK_VOICE);
  }
  if (!res.ok) {
    return Response.json({ error: `deepgram ${res.status}: ${await res.text()}` }, { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Sample-Rate": String(SAMPLE_RATE),
      "Cache-Control": "no-store",
    },
  });
}
