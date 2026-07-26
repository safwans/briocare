import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Ingest for Daily LIVE transcription. The clinician's Live Room captures `transcription-message`
// events (attributed by participant → patientId) and POSTs them here in batches. We append them to
// each teen's Transcript so the batch pipeline can generate grounded notes without any recording.

type IncomingSeg = { patientId?: string; text?: string; startMs?: number; endMs?: number; confidence?: number };
type Seg = { startMs: number; endMs: number; text: string; confidence?: number };

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { segments?: IncomingSeg[] };
  const incoming = (body.segments ?? []).filter((s) => typeof s.patientId === "string" && s.text && s.text.trim().length > 0);
  if (incoming.length === 0) return Response.json({ ok: true, appended: 0 });

  // group by patient, append to each track's transcript
  const byPatient = new Map<string, IncomingSeg[]>();
  for (const s of incoming) {
    const arr = byPatient.get(s.patientId as string) ?? [];
    arr.push(s);
    byPatient.set(s.patientId as string, arr);
  }

  let appended = 0;
  for (const [patientId, segs] of byPatient) {
    const track = await prisma.mediaTrack.upsert({
      where: { sessionId_patientId: { sessionId, patientId } },
      create: { sessionId, patientId, gcsUri: `daily-live://${sessionId}` },
      update: { gcsUri: `daily-live://${sessionId}` },
    });
    const existing = await prisma.transcript.findUnique({ where: { trackId: track.id } });
    const prior = (Array.isArray(existing?.segments) ? existing!.segments : []) as Seg[];
    const newSegs: Seg[] = segs.map((s) => ({ startMs: Math.max(0, Math.floor(s.startMs ?? 0)), endMs: Math.max(0, Math.floor(s.endMs ?? s.startMs ?? 0)), text: s.text!.trim(), ...(s.confidence != null ? { confidence: s.confidence } : {}) }));

    // Every participant's client captures the same room-wide transcription stream, so the same
    // utterance arrives once per connected client. Collapse on (startMs, text): startMs is Daily's
    // server-assigned timestamp, identical across capturers for one utterance, while a genuine
    // repeat of the same words lands at a different time and is kept. This is what makes redundant
    // capture safe — losing any single client no longer loses the transcript.
    const seen = new Set<string>();
    const merged: Seg[] = [];
    for (const seg of [...prior, ...newSegs]) {
      const key = `${seg.startMs}|${seg.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(seg);
    }
    merged.sort((a, b) => a.startMs - b.startMs);
    const lowConf: Seg[] = merged.filter((m) => m.confidence != null && m.confidence < 0.6);
    if (existing) await prisma.transcript.update({ where: { trackId: track.id }, data: { segments: merged, lowConfSpans: lowConf } });
    else await prisma.transcript.create({ data: { trackId: track.id, segments: merged, lowConfSpans: lowConf } });
    appended += newSegs.length;
  }
  return Response.json({ ok: true, appended });
}
