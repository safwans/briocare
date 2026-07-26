import { NextRequest } from "next/server";
import { directTurn, type DirectInput } from "@/lib/simbots";
import { simEnabled } from "@/lib/sim";

// One conversational turn for the AI patients: given what the therapist just said, Claude picks
// which teen answers and what they say. Server-side so ANTHROPIC_API_KEY stays server-side.
export async function POST(req: NextRequest) {
  if (!simEnabled()) return new Response(null, { status: 404 });

  const body = (await req.json().catch(() => null)) as DirectInput | null;
  if (!body?.personas?.length) return Response.json({ turns: [] });

  try {
    const turns = await directTurn({
      cohortName: body.cohortName ?? "",
      module: body.module ?? "",
      personas: body.personas,
      history: (body.history ?? []).slice(-12),
      therapistSaid: (body.therapistSaid ?? "").trim(),
      arrivalPatientId: body.arrivalPatientId,
      riskRehearsal: !!body.riskRehearsal,
    });
    // Hard cap: the schema asks for 1-3 short sentences, but a run-on reply becomes a 20-second
    // monologue that nobody can interrupt naturally. Clamp at the sentence boundary.
    const clipped = turns.slice(0, 2).map((t) => {
      const text = t.text.trim();
      if (text.length <= 260) return t;
      const cut = text.slice(0, 260);
      const lastStop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("?"), cut.lastIndexOf("!"));
      return { ...t, text: lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…` };
    });
    return Response.json({ turns: clipped });
  } catch (e) {
    return Response.json({ turns: [], error: e instanceof Error ? e.message : "director failed" }, { status: 500 });
  }
}
