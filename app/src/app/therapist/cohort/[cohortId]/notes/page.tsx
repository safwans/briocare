import Link from "next/link";
import { notFound } from "next/navigation";
import { getNotesReview, sectionLabel, type ClaimView } from "@/lib/queries";
import { saveSection, dispositionFlag, processSessionAction, approveGroupNote } from "@/lib/actions";
import NoteActions from "@/components/NoteActions";
import NoteSessionPicker from "@/components/NoteSessionPicker";

// Informational grounding tag shown in the expandable evidence — no action, just where each statement comes from.
const GROUNDING: Record<ClaimView["verdict"], { label: string; color: string; bg: string }> = {
  SUPPORTED: { label: "Grounded", color: "#2f7a86", bg: "#e7f2f2" },
  CLINICIAN_ATTESTED: { label: "Grounded", color: "#2f7a86", bg: "#e7f2f2" },
  UNCERTAIN: { label: "Partial", color: "#8a6d3b", bg: "#f6f0e3" },
  UNSUPPORTED: { label: "Inferred", color: "#7c6f63", bg: "#efece8" },
};

export default async function NotesReviewPage({
  params, searchParams,
}: {
  params: Promise<{ cohortId: string }>;
  searchParams: Promise<{ note?: string; session?: string; patient?: string }>;
}) {
  const { cohortId } = await params;
  const { note, session, patient } = await searchParams;
  const sessionNum = session ? Number(session) : undefined;
  const data = await getNotesReview(cohortId, note, Number.isFinite(sessionNum) ? sessionNum : undefined, patient);
  if (!data) notFound();

  const showGroup = note === "group" && !!data.group;
  const sel = data.selected;
  const approvedPct = data.total ? Math.round((data.approvedCount / data.total) * 100) : 0;

  const ehrText = sel
    ? sel.sections.map((s) => `${sectionLabel(s.key)}\n${s.body}`).join("\n\n") +
      `\n\nGoal progress:\n${sel.goalSignals.map((g) => `- ${g.goal}: ${g.status}`).join("\n")}`
    : "";

  return (
    <div className="flex min-h-screen">
      {/* Note list */}
      <div className="w-80 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="text-xs font-semibold text-slate-400">Step 3 · Human-in-the-loop review</div>
          <h1 className="text-xl font-bold tracking-tight">Note review</h1>
          <div className="text-sm text-slate-500 mt-1">{data.cohort.name}</div>
          {data.sessionIndex != null ? (
            <NoteSessionPicker cohortId={cohortId} current={data.sessionIndex} sessionTag={data.sessionTag} sessions={data.sessions} carry={showGroup ? "note=group" : sel?.patientId ? `patient=${sel.patientId}` : undefined} />
          ) : (
            <div className="text-xs text-slate-400 mt-0.5">No sessions have run yet</div>
          )}
          {data.scopeLine && <div className="text-xs text-slate-400 mt-2 leading-relaxed">{data.scopeLine}</div>}
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[#3f9a7d] transition-all" style={{ width: `${approvedPct}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1.5">{data.approvedCount} of {data.total} approved</div>
          {data.total > 0 && data.approvedCount === data.total && (
            <div className="mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold" style={{ background: "#e7f3ee", border: "1px solid #b6dccb", color: "#2e7a5f" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3f9a7d" }} />All caught up — every note signed off
            </div>
          )}
        </div>

        {data.total === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {data.completedCount > 0
              ? `${data.completedCount} session${data.completedCount === 1 ? "" : "s"} completed, none with notes yet. Pick one above and generate its notes.`
              : "No notes generated for this cohort yet."}
          </div>
        ) : (
          <>
            {data.list.map((n) => {
              const active = !showGroup && sel?.id === n.noteId;
              return (
                <Link
                  key={n.noteId}
                  href={`/therapist/cohort/${cohortId}/notes?note=${n.noteId}${data.sessionIndex != null ? `&session=${data.sessionIndex}` : ""}`}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 ${active ? "bg-slate-50 border-l-2 border-l-[#1c7b8c]" : "hover:bg-slate-50"}`}
                >
                  <span className="grid place-items-center w-8 h-8 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {n.patientName.split(" ").map((s) => s[0]).join("")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm">{n.patientName}</div>
                    <div className="text-xs text-slate-400">Individual progress note</div>
                  </div>
                  <StatusPill status={n.status} />
                </Link>
              );
            })}
            {data.group && (
              <Link
                href={`/therapist/cohort/${cohortId}/notes?note=group${data.sessionIndex != null ? `&session=${data.sessionIndex}` : ""}`}
                className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 ${showGroup ? "bg-slate-50 border-l-2 border-l-[#1c7b8c]" : "hover:bg-slate-50"}`}
              >
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#e5f1f2] text-[11px] font-bold text-[#135463]">GRP</span>
                <div className="flex-1"><div className="font-medium text-slate-800 text-sm">Group note</div><div className="text-xs text-slate-400">Session-level summary</div></div>
                <StatusPill status={data.group.status} />
              </Link>
            )}
          </>
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 bg-[#f5f8f8] overflow-y-auto">
        <div className="max-w-3xl mx-auto px-10 py-8">
          <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-6" style={{ background: "#e5f1f2", border: "1px solid #c9e2e5" }}>
            <span className="w-5 h-5 rounded-full shrink-0" style={{ background: "linear-gradient(150deg,#2fa4b8,#135463)" }} />
            <span className="text-[13px] text-[#135463] leading-snug">
              {data.hasNotes
                ? `Drafted by BrioCare from your Session ${data.sessionIndex} capture. Notes are generated only after a session runs — review and edit; nothing is filed until you approve. Then paste into your EHR.`
                : "Notes are drafted from a session's capture. Generate them for a session that has ended, then review and edit — nothing is filed until you approve."}
            </span>
          </div>

          {showGroup && data.group ? (
            <GroupNoteView group={data.group} />
          ) : sel ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="grid place-items-center w-11 h-11 rounded-full bg-slate-100 text-base font-semibold text-slate-600">
                  {sel.patientName.split(" ").map((s) => s[0]).join("")}
                </span>
                <h2 className="text-xl font-bold">{sel.patientName}</h2>
                <span className="ml-auto"><StatusPill status={sel.status} /></span>
              </div>

              {/* Sits above the note body on purpose: a contradiction between how the teen read
                  and what the participation signal measured is exactly what a skim misses. */}
              {sel.signalAlignment?.status === "DIVERGENT" && sel.signalAlignment.note && (
                <div className="rounded-xl p-4 my-4" style={{ background: "#fbf3e3", border: "1px solid #ecd9ae" }}>
                  <div className="text-sm font-bold" style={{ color: "#8a6d3b" }}>
                    ⚠ Narrative and participation signal disagree
                  </div>
                  <div className="text-sm text-slate-700 mt-1 leading-relaxed">{sel.signalAlignment.note}</div>
                  <div className="text-xs text-slate-500 mt-1.5">
                    Both are shown below — read the Participation section before signing off.
                  </div>
                </div>
              )}

              {sel.acuteFlag && (
                <div className="rounded-xl p-4 my-4" style={{ background: "#fbeef1", border: "1px solid #f0cdd6" }}>
                  <div className="text-sm font-bold" style={{ color: "#8f3a4c" }}>● Flagged for your attention</div>
                  <div className="text-sm text-slate-700 mt-1">{sel.acuteFlag.category.replaceAll("_", " ")} · acute</div>
                  <div className="text-xs text-slate-500 italic mt-1">“{sel.acuteFlag.quote}”</div>
                  {sel.acuteFlag.status === "ACKNOWLEDGED" ? (
                    <div className="text-xs mt-2 font-medium" style={{ color: "#2f7a86" }}>Dispositioned: {sel.acuteFlag.disposition.replaceAll("_", " ")} ✓</div>
                  ) : (
                    <form action={dispositionFlag} className="mt-2 flex flex-wrap gap-1">
                      <input type="hidden" name="flagId" value={sel.acuteFlag.id} />
                      {["REVIEWED", "ADDRESSED", "ESCALATED"].map((d) => (
                        <button key={d} name="disposition" value={d} className="text-[11px] rounded-md border border-slate-300 bg-white px-2 py-1 hover:border-[#b8556a] hover:text-[#b8556a]">
                          {d.charAt(0) + d.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </form>
                  )}
                </div>
              )}

              {/* Sections */}
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden mt-5">
                {sel.sections.map((s) => (
                  <div key={s.id} className="p-5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#1c7b8c]">{sectionLabel(s.key)}</div>
                      {s.edited && <span className="text-[10px] text-slate-400">edited</span>}
                    </div>
                    {sel.status === "APPROVED" ? (
                      <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{s.body}</p>
                    ) : (
                      <form action={saveSection} className="space-y-2">
                        <input type="hidden" name="sectionId" value={s.id} />
                        <textarea
                          name="body"
                          defaultValue={s.body}
                          rows={Math.min(16, Math.max(3, Math.ceil(s.body.length / 68)))}
                          className="w-full rounded-lg border border-slate-200 p-3 text-[15px] leading-relaxed text-slate-800 focus:border-[#1c7b8c] focus:outline-none resize-y"
                        />
                        <button className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#1c7b8c] hover:bg-slate-100">Save edit</button>
                      </form>
                    )}

                    {s.claims.length > 0 && (
                      <details className="mt-3 group">
                        <summary className="inline-flex items-center gap-1.5 cursor-pointer select-none list-none text-[12px] font-semibold text-[#1c7b8c]">
                          <span className="transition-transform group-open:rotate-90">▸</span>
                          Show evidence
                        </summary>
                        <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 space-y-3">
                          <p className="text-[12px] text-slate-400">Where each statement comes from in the session record.</p>
                          {s.claims.map((c) => {
                            const g = GROUNDING[c.verdict];
                            return (
                              <div key={c.id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ color: g.color, background: g.bg }}>{g.label}</span>
                                  <span className="text-[13px] text-slate-600 leading-snug flex-1">{c.text}</span>
                                </div>
                                {c.evidence.length > 0 ? (
                                  <div className="mt-1.5 ml-1 space-y-1">
                                    {c.evidence.map((e, i) => (
                                      <div key={i} className="pl-2.5 border-l-2 border-slate-200 text-[13px] text-slate-500 italic">
                                        {e.kind === "metric" ? <span className="not-italic text-[#1c7b8c] font-medium">metric · </span> : null}“{e.quote}”
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-1 ml-1 text-[12.5px] text-slate-400 italic">No direct quote — clinical inference.</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {/* Goal progress */}
                <div className="p-5">
                  <div className="text-xs font-bold uppercase tracking-wide text-[#1c7b8c] mb-2">Goal progress</div>
                  {sel.goalSignals.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 text-sm">
                      <span className="w-2 h-2 rounded-full bg-[#3f9a7d]" />
                      <span className="flex-1 text-slate-700">{g.goal}</span>
                      <span className="text-xs font-semibold text-slate-500">{g.status.replaceAll("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit trail */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 mt-5">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Audit trail</div>
                {sel.audit.length === 0 ? (
                  <div className="text-sm text-slate-400 italic">Nothing filed yet — actions are logged on save, attest, disposition, and approval.</div>
                ) : (
                  sel.audit.map((a, i) => (
                    <div key={i} className="flex gap-3 items-start py-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1c7b8c] mt-1.5 shrink-0" />
                      <div><div className="text-sm text-slate-700">{a.text}</div><div className="text-xs text-slate-400">{new Date(a.at).toLocaleString()}</div></div>
                    </div>
                  ))
                )}
              </div>

              {/* Attestation + approve + copy */}
              {sel.status === "APPROVED" ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-5 mt-5 text-sm">
                  <div className="font-semibold" style={{ color: "#2f8f6f" }}>Approved ✓</div>
                  <div className="text-xs text-slate-500 mt-1">Ready to paste into your EHR.</div>
                </div>
              ) : (
                <NoteActions noteId={sel.id} approvable={sel.approvable} blockedReason={sel.blockedReason} ehrText={ehrText} />
              )}
            </>
          ) : !data.hasNotes && data.sessionId ? (
            /* A session that has ended but was never processed — offer to draft its notes here,
               so the cohort's history is reachable without hunting for the live-room URL. */
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <h2 className="text-lg font-bold tracking-tight text-[#24343b]">Session {data.sessionIndex} has no notes yet</h2>
              <p className="text-[13.5px] text-slate-500 leading-relaxed mt-2 max-w-md mx-auto">
                This session has ended but its capture hasn&apos;t been drafted into notes. Generate them to review,
                edit and sign off — nothing is filed until you approve.
              </p>
              <form action={processSessionAction} className="mt-5">
                <input type="hidden" name="sessionId" value={data.sessionId} />
                <button className="rounded-xl px-6 py-3 text-[15px] font-bold" style={{ background: "#e8c05a", color: "#3a3016" }}>
                  Generate notes
                </button>
              </form>
            </div>
          ) : (
            <div className="text-slate-500">No note selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupNoteView({ group }: { group: NonNullable<Awaited<ReturnType<typeof getNotesReview>>>["group"] }) {
  if (!group) return null;
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <span className="grid place-items-center w-11 h-11 rounded-lg bg-[#e5f1f2] text-sm font-bold text-[#135463]">GRP</span>
        <h2 className="text-xl font-bold">Group note</h2>
        <span className="ml-auto"><StatusPill status={group.status} /></span>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        {group.sections.map((s, i) => (
          <div key={i} className="p-5 border-b border-slate-100 last:border-0">
            <div className="text-xs font-bold uppercase tracking-wide text-[#1c7b8c] mb-2">{s.label}</div>
            <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{s.body}</p>
          </div>
        ))}
        <div className="p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#1c7b8c] mb-2">Cohort goal indicators</div>
          {group.goalIndicators.map((g, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#3f9a7d]" />
              <span className="flex-1 text-slate-700">{g.label}</span>
              <span className="text-xs font-semibold text-slate-500">{g.status.replaceAll("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign-off for the group note. It carried status/approvedBy in the schema from the start but
          had no action or button, so a session's group note could never actually be filed. */}
      <div className="mt-4 flex items-center gap-3">
        {group.status === "APPROVED" ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg" style={{ color: "#2f8f6f", background: "#e7f4ee" }}>
            ✓ Approved &amp; filed
          </span>
        ) : (
          <form action={approveGroupNote}>
            <input type="hidden" name="noteId" value={group.id} />
            <button className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "#1c6b78" }}>
              Approve group note
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: "Draft", color: "#b06a1e", bg: "#fbf1e3" },
    IN_REVIEW: { label: "In review", color: "#2f7a86", bg: "#e7f2f2" },
    APPROVED: { label: "Approved", color: "#2f8f6f", bg: "#e7f4ee" },
  };
  const m = map[status] ?? map.DRAFT;
  return <span style={{ color: m.color, background: m.bg }} className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold">{m.label}</span>;
}
