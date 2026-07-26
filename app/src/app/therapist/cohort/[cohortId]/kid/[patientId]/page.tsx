import Link from "next/link";
import { notFound } from "next/navigation";
import { getKidDetail } from "@/lib/queries";
import { StatusChip, HelpLabel } from "@/components/parts";
import { STATUS_META } from "@/lib/status";

export default async function KidDetailPage({ params }: { params: Promise<{ cohortId: string; patientId: string }> }) {
  const { cohortId, patientId } = await params;
  const kid = await getKidDetail(cohortId, patientId);
  if (!kid) notFound();

  const W = 560, H = 150, pad = 10;
  const color = STATUS_META[kid.status].color;
  const n = kid.trend.length;
  const y = (pi: number) => pad + (1 - pi / 100) * (H - 2 * pad);
  const px = (i: number) => pad + (n > 1 ? (i / (n - 1)) : 0) * (W - 2 * pad);
  const pts = kid.trend.map((v, i) => `${px(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const baseY = kid.baseline != null ? y(kid.baseline) : null;
  // HTML-overlay dot positions (SVG uses preserveAspectRatio=none, so SVG circles would distort)
  const dots = kid.trend.map((v, i) => ({ leftPct: (px(i) / W) * 100, topPx: y(v), present: kid.attendance[i] ?? true }));
  const rawMetricLabels = new Set(["Talk time", "Speaking turns", "Camera on", "Presence"]);

  return (
    <div className="px-10 py-8 max-w-5xl">
      <Link href={`/therapist/cohort/${cohortId}`} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4">
        <span className="text-lg leading-none">←</span> Back to cohort review
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <span className="grid place-items-center w-14 h-14 rounded-full text-lg font-bold" style={{ background: STATUS_META[kid.status].bg, color: STATUS_META[kid.status].color }}>
          {kid.name.split(" ").map((s) => s[0]).join("")}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{kid.name}</h1>
          <div className="text-sm text-slate-500">Age {kid.age} · {kid.cohort.name} · with Dr. Cho</div>
        </div>
        <span className="ml-auto flex items-center gap-2">
          {!kid.presentLatest && kid.latestLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "#fbeef1", color: "#b8556a" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#b8556a" }} />Absent from {kid.latestLabel}
            </span>
          )}
          <StatusChip status={kid.status} />
        </span>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 mb-4">
        {/* Trend chart */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div className="font-semibold text-slate-800"><HelpLabel label="Participation index" /> vs. own baseline</div>
            <div className="text-xs text-slate-400">Recent sessions</div>
          </div>
          <div className="relative" style={{ height: H }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="overflow-visible">
              {baseY != null && <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#c5d5d6" strokeWidth={1.5} strokeDasharray="5 5" />}
              <polyline points={pts} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* session dots — absent sessions get a red hollow ring so a dip reads as "missed" not "low" */}
            {dots.map((d, i) => (
              <span
                key={i}
                title={d.present ? `${kid.labels[i]} · present` : `${kid.labels[i]} · absent`}
                className="absolute rounded-full"
                style={
                  d.present
                    ? { left: `${d.leftPct}%`, top: d.topPx, width: 7, height: 7, background: color, transform: "translate(-50%,-50%)" }
                    : { left: `${d.leftPct}%`, top: d.topPx, width: 11, height: 11, background: "#fff", border: "2.5px solid #b8556a", transform: "translate(-50%,-50%)" }
                }
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs">
            {kid.labels.map((l, i) => (
              <span key={i} className={kid.attendance[i] === false ? "font-semibold text-[#b8556a]" : "text-slate-400"}>{l}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block w-5 border-t border-dashed border-slate-300" /> Baseline</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} /> Present</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-white" style={{ border: "2px solid #b8556a" }} /> Absent</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col gap-4">
          {/* Attendance — framed first */}
          <div className="pb-3 border-b border-slate-100">
            <div className="text-sm text-slate-500">Attendance</div>
            <div className="text-xl font-bold text-slate-800">{kid.attendedCount} of {kid.totalSessions} sessions</div>
            <div className="text-xs mt-0.5 font-medium" style={{ color: kid.missedLabels.length ? "#b8556a" : "#3f9a7d" }}>
              {kid.missedLabels.length ? `Missed ${kid.missedLabels.join(", ")}` : "Present every session"}
            </div>
          </div>
          {!kid.presentLatest && kid.latestLabel && (
            <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: "#fbeef1", color: "#8f3a4c" }}>
              Absent from {kid.latestLabel} — this session&apos;s talk, turns, camera and presence reflect the missed session, not disengagement.
            </div>
          )}
          {kid.metrics.map((m, i) => {
            const absentRaw = !kid.presentLatest && rawMetricLabels.has(m.label);
            return (
              <div key={i} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0">
                <div>
                  <div className="text-sm text-slate-500"><HelpLabel label={m.label} /></div>
                  {absentRaw ? (
                    <div className="text-xl font-bold text-slate-300">—<span className="ml-2 text-sm font-medium text-slate-400">absent</span></div>
                  ) : (
                    <div className="text-xl font-bold text-slate-800">{m.value}</div>
                  )}
                </div>
                {!absentRaw && m.delta && <span className="text-sm font-semibold" style={{ color: m.deltaNeg ? "#b8556a" : "#3f9a7d" }}>{m.delta}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Note history */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <div className="font-semibold text-slate-800 mb-4">Note history</div>
        {kid.history.length === 0 && <div className="text-sm text-slate-400 italic">No notes yet.</div>}
        {kid.history.map((h, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
            <div className="text-sm font-semibold text-[#1c7b8c] w-20 shrink-0">{h.session}</div>
            <div className="text-sm text-slate-600 leading-relaxed">{h.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
