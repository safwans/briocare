// Server-only Daily (CPaaS) helper. See docs/cpaas-integration.md.
// This is the MediaProvider port — swap for LiveKit in production without touching callers.
import "server-only";

const API = "https://api.daily.co/v1";

function apiKey(): string {
  const k = process.env.DAILY_API_KEY;
  if (!k) throw new Error("DAILY_API_KEY is not set");
  return k;
}

function roomName(sessionId: string): string {
  return `sess-${sessionId}`;
}

async function daily(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Idempotently create (or fetch) the Daily room for a session. Camera/mic start OFF (MVP). */
export async function ensureRoom(sessionId: string): Promise<{ name: string; url: string }> {
  const name = roomName(sessionId);
  const got = await daily(`/rooms/${name}`);
  if (got.ok) {
    const j = (await got.json()) as { url: string };
    return { name, url: j.url };
  }
  const created = await daily(`/rooms`, {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        enable_chat: true,
        start_video_off: true,
        start_audio_off: true,
        exp: Math.floor(Date.now() / 1000) + 4 * 3600,
      },
    }),
  });
  if (!created.ok) throw new Error(`Daily create room failed: ${created.status} ${await created.text()}`);
  const j = (await created.json()) as { url: string };
  return { name, url: j.url };
}

/** Mint a short-lived meeting token. userId attributes events (teen = patientId; clinician = clinician-<id>). */
export async function mintToken(opts: {
  sessionId: string;
  isOwner: boolean;
  userName: string;
  userId: string;
  /**
   * Per-participant override of the room's `start_audio_off: true`. Set false only for the dev
   * AI-patient bots, which publish synthesized speech and are useless muted. Left undefined for
   * real people so the product's "mic stays off until you're ready" default still holds.
   */
  startAudioOff?: boolean;
}): Promise<string> {
  const r = await daily(`/meeting-tokens`, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: roomName(opts.sessionId),
        is_owner: opts.isOwner,
        user_name: opts.userName,
        user_id: opts.userId,
        ...(opts.startAudioOff === undefined ? {} : { start_audio_off: opts.startAudioOff }),
        exp: Math.floor(Date.now() / 1000) + 4 * 3600,
      },
    }),
  });
  if (!r.ok) throw new Error(`Daily token failed: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { token: string }).token;
}

export async function deleteRoom(sessionId: string): Promise<void> {
  await daily(`/rooms/${roomName(sessionId)}`, { method: "DELETE" });
}
