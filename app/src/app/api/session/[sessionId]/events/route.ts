import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const VALID = new Set([
  "JOIN", "LEAVE", "CAMERA_ON", "CAMERA_OFF", "SPEAKING_START", "SPEAKING_END", "CHAT",
]);

type IncomingEvent = { patientId?: string; type?: string; atMs?: number };

// Client-side capture posts CPaaS participant events here → EngagementEvent (no transcript/PHI text).
// (In production, Daily server webhooks are the source of truth; client capture works for local dev.)
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { events?: IncomingEvent[] };
  const events = (body.events ?? [])
    .filter((e) => e.type && VALID.has(e.type) && typeof e.patientId === "string")
    .map((e) => ({
      sessionId,
      patientId: e.patientId as string,
      type: e.type as "JOIN" | "LEAVE" | "CAMERA_ON" | "CAMERA_OFF" | "SPEAKING_START" | "SPEAKING_END" | "CHAT",
      atMs: Math.max(0, Math.floor(e.atMs ?? 0)),
    }));

  if (events.length) await prisma.engagementEvent.createMany({ data: events });
  return Response.json({ ok: true, inserted: events.length });
}
