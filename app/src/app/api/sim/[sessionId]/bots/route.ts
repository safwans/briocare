import { NextRequest } from "next/server";
import { buildFleet } from "@/lib/simbots";
import { simEnabled } from "@/lib/sim";

// Provisions the AI-patient fleet for a live session: the Daily room URL plus one short-lived
// meeting token per simulated teen. Gated on simEnabled() — unlike the capture ingest routes,
// this one mints room tokens, so the gate is not optional.
export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  if (!simEnabled()) return new Response(null, { status: 404 });

  const { sessionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { limit?: number };
  const limit = Math.max(1, Math.min(8, Math.floor(body.limit ?? 6)));

  try {
    return Response.json(await buildFleet(sessionId, limit));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed to build fleet" }, { status: 400 });
  }
}
