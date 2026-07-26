import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureRoom, mintToken } from "@/lib/daily";
import { setSessionStatus, processSessionAction } from "@/lib/actions";
import LiveRoom from "@/components/LiveRoomLazy";
import LiveRoomWithSimLazy from "@/components/LiveRoomWithSimLazy";
import { asrMode } from "@/lib/asr";
import { simEnabled } from "@/lib/sim";
import { focusLabel } from "@/components/parts";

export default async function ClinicianLivePage({
  params,
}: {
  params: Promise<{ cohortId: string; sessionId: string }>;
}) {
  const { cohortId, sessionId } = await params;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { cohort: { include: { enrollments: { where: { status: "ACTIVE" }, include: { patient: true } } } } },
  });
  if (!session || session.cohortId !== cohortId) notFound();
  const clinician = await prisma.clinician.findFirst({ include: { user: true } });

  const codedTitle = `${session.cohort.code} · ${focusLabel(session.cohort.focus)}`;
  const meetsOn = session.cohort.meetsOn;
  const meetsAt = session.cohort.meetsAt;
  // Where this session sits in the programme. Previously this only ever said "next session
  // <meeting day>", which is the cohort's weekly slot rather than anything about THIS session —
  // so the room gave no indication of what came before or what's actually next.

  const roster = session.cohort.enrollments.map((e) => ({
    patientId: e.patientId,
    name: `${e.patient.firstName} ${e.patient.lastName}`,
    initials: `${e.patient.firstName[0] ?? ""}${e.patient.lastName[0] ?? ""}`.toUpperCase(),
  }));
  const firstPatientId = roster[0]?.patientId;

  // Neighbouring sessions, so the room can say where this one sits in the programme instead of
  // showing a session number with no context.
  const [prevSession, nextSession] = await Promise.all([
    prisma.session.findFirst({
      where: { cohortId, index: { lt: session.index }, status: { in: ["ENDED", "PROCESSING", "READY"] } },
      orderBy: { index: "desc" },
      select: { index: true, scheduledAt: true },
    }),
    prisma.session.findFirst({
      where: { cohortId, index: { gt: session.index }, status: "SCHEDULED" },
      orderBy: { index: "asc" },
      select: { index: true, scheduledAt: true },
    }),
  ]);
  const dayMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // ---------- LIVE ----------
  if (session.status === "LIVE") {
    // Rehydration for the live room. Speaking time and the transcript are already persisted while
    // the session runs, but the room used to render them from component state only — so switching
    // to another tab and back reset every timer to 0:00 and blanked the transcript on a session
    // that was still going. Read them back so re-entering resumes rather than restarts.
    const [events, tracks] = await Promise.all([
      prisma.engagementEvent.findMany({
        where: { sessionId, type: { in: ["SPEAKING_START", "SPEAKING_END"] } },
        orderBy: { atMs: "asc" },
        select: { patientId: true, type: true, atMs: true },
      }),
      prisma.mediaTrack.findMany({ where: { sessionId }, include: { transcript: true } }),
    ]);

    const initialSpeaking: Record<string, number> = {};
    const openAt: Record<string, number> = {};
    for (const e of events) {
      if (e.type === "SPEAKING_START") openAt[e.patientId] = e.atMs;
      else if (openAt[e.patientId] != null) {
        initialSpeaking[e.patientId] = (initialSpeaking[e.patientId] ?? 0) + (e.atMs - openAt[e.patientId]);
        delete openAt[e.patientId];
      }
    }

    // Segments carry Daily's absolute timestamps, so ordering across members is meaningful.
    const initialTranscript = tracks
      .flatMap((t) =>
        ((t.transcript?.segments as { startMs: number; text: string }[] | undefined) ?? []).map((s) => ({
          patientId: t.patientId,
          text: s.text,
          startMs: s.startMs,
        }))
      )
      .sort((a, b) => a.startMs - b.startMs)
      .slice(-100)
      .map(({ patientId, text }) => ({ patientId, text }));

    // Only provision the Daily room when the session is actually live.
    const room = await ensureRoom(sessionId);
    const token = await mintToken({
      sessionId,
      isOwner: true,
      userName: clinician?.user.displayName ?? "Facilitator",
      userId: `clinician-${clinician?.id ?? "x"}`,
      // The room is created with start_audio_off:true so teens arrive muted. The facilitator is
      // running the group and needs to be heard from the first second — and the client-side
      // setLocalAudio(true) alone isn't enough against that room default. bot-fleet.ts already
      // learned this: it calls the token flag "the server-side half of unmuting". The bots got it;
      // the clinician never did, which is why the therapist's mic didn't actually work.
      startAudioOff: false,
    });
    const liveRoomProps = {
      roomUrl: room.url,
      token,
      sessionId,
      asrMode: asrMode(),
      canTranscribe: true,
      variant: "facilitator" as const,
      roster,
      cohortName: codedTitle,
      sessionIndex: session.index,
      facilitatorName: clinician?.user.displayName ?? "Facilitator",
      onLeaveHref: `/therapist/cohort/${cohortId}`,
      initialSpeaking,
      initialTranscript,
    };
    return (
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/therapist/cohort/${cohortId}`} className="text-[#1c7b8c] hover:underline">← Caseload</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">Live room</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{codedTitle}</h1>
            <div className="text-sm text-slate-500">Session {session.index} · {session.module} · {meetsOn}s {meetsAt}</div>
          </div>
          <form action={setSessionStatus}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="status" value="ENDED" />
            <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white bg-[#b8556a]">End session</button>
          </form>
        </div>

        {/* When the simulator is enabled the room is wrapped so each roster tile gets a
            "Simulate via AI" control. Same gate as the /api/sim/* routes it calls. */}
        {simEnabled() ? (
          <LiveRoomWithSimLazy {...liveRoomProps} />
        ) : (
          <div className="mt-4 rounded-2xl overflow-hidden border" style={{ height: "80vh", borderColor: "#1e3a44" }}>
            <LiveRoom {...liveRoomProps} />
          </div>
        )}

        {/* Capture + consent notice — below the room; scroll to view */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Background capture</div>
            <p className="text-[13px] leading-relaxed text-slate-600">
              Per-participant speech, transcribed live, plus presence telemetry. No live prompts, no real-time risk detection — you run the room.
            </p>
          </div>
          {/* Said "Recording consent … recording began only after all present joined" — but no room is
              ever created with enable_recording (daily.ts), there is no recording webhook or storage
              client, and MediaTrack.gcsUri only ever holds a daily-live:// or synthetic:// marker.
              The card asserted a recording the app never starts; it now states what actually happens. */}
          <div className="rounded-xl p-4" style={{ background: "#eef6f1", border: "1px solid #cbe3d5" }}>
            <div className="flex items-center gap-2 mb-1">
              <span>🔒</span>
              <span className="text-[13px] font-bold" style={{ color: "#2e7a5f" }}>Capture consent</span>
            </div>
            <div className="text-[13px] leading-relaxed text-slate-600">
              Two-party consent satisfied. Guardian consent on file for every member. Audio is transcribed in real time and not retained — we store the transcript and participation telemetry only.
            </div>
          </div>
        </div>

        {firstPatientId && (
          <p className="text-xs text-slate-400 mt-3">
            Teen join link (demo):{" "}
            <Link className="text-[#1c7b8c] underline" href={`/patient/join/${sessionId}?p=${firstPatientId}`} target="_blank">
              /patient/join/{sessionId.slice(0, 8)}…
            </Link>{" "}
            — open in another tab/window to join as a participant.
          </p>
        )}
      </div>
    );
  }

  // ---------- IDLE (scheduled / ended / processing / ready) — matches the mock ----------
  const st = session.status;
  const idle = {
    pill:
      st === "SCHEDULED" ? "No session in progress"
      : st === "PROCESSING" ? "Processing"
      : st === "FAILED" ? "Note generation failed"
      : "Session ended",
    headline: st === "SCHEDULED" ? `Session ${session.index} hasn't started yet` : `Session ${session.index} has ended`,
    body:
      st === "SCHEDULED"
        // Was hardcoded to "today", which read as wrong on every day that wasn't the cohort's
        // meeting day. Name the actual day and date this session is scheduled for.
        ? `Scheduled for ${meetsOn} ${dayMonth(session.scheduledAt)} at ${meetsAt}. When your members join, start the room and BrioCare will begin capturing participation in the background — silently.`
        : st === "PROCESSING"
        ? "The room is closed. BrioCare is drafting this session's notes from the capture. If this has been sitting here for more than a few minutes, generation stopped partway — run it again."
        : st === "FAILED"
        ? "Note generation didn't finish, so nothing was filed. Your capture is safe — run it again."
        : st === "READY"
        ? "The room is closed. BrioCare has drafted this session's notes from the capture — they're waiting for your review and sign-off."
        : "The room is closed. Generate this session's notes from the capture to review and sign off.",
  };

  return (
    <div className="min-h-[calc(100vh-44px)] flex flex-col items-center justify-center text-center px-10 py-16" style={{ background: "#0e2029", color: "#cfe0e2" }}>
      <div className="max-w-[460px] flex flex-col items-center">
        <div className="w-[88px] h-[88px] rounded-3xl grid place-items-center mb-7" style={{ background: "#12303a", border: "1px solid #1e4a56" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4f7d88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="13" height="12" rx="2.5" />
            <path d="M15 10.5 22 7v10l-7-3.5" />
          </svg>
        </div>
        <div className="text-[12px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "#6a8b93" }}>{idle.pill}</div>
        <h2 className="text-[26px] font-bold tracking-tight text-white mb-3">{idle.headline}</h2>
        <p className="text-[15px] leading-relaxed mb-7" style={{ color: "#9db8bd" }}>{idle.body}</p>

        <div className="flex items-center justify-center gap-3">
          {st === "SCHEDULED" && (
            <form action={setSessionStatus}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="status" value="LIVE" />
              <button className="rounded-[11px] px-6 py-3 text-[15px] font-bold text-white" style={{ background: "#2fa4b8" }}>Start session room</button>
            </form>
          )}
          {/* PROCESSING is included deliberately. Note generation runs inside the request, so a
              Cloud Run timeout kills it mid-flight and the status never advances past PROCESSING —
              without a retry here the session is unrecoverable from the UI. Re-running is safe:
              the pipeline deletes and recreates a session's notes rather than appending. */}
          {(st === "ENDED" || st === "FAILED" || st === "PROCESSING") && (
            <form action={processSessionAction}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <button className="rounded-[11px] px-6 py-3 text-[15px] font-bold" style={{ background: "#e8c05a", color: "#3a3016" }}>Generate notes</button>
            </form>
          )}
          {st === "READY" && (
            <Link href={`/therapist/cohort/${cohortId}/notes`} className="rounded-[11px] px-6 py-3 text-[15px] font-bold" style={{ background: "#e8c05a", color: "#3a3016" }}>
              Go to note review
            </Link>
          )}
          <Link href={`/therapist/cohort/${cohortId}`} className="rounded-[11px] px-5 py-3 text-[15px] font-semibold" style={{ border: "1.5px solid #2c454f", color: "#cfe0e2" }}>
            Back to cohort
          </Link>
        </div>
      </div>

      <div className="mt-8 text-[13px]" style={{ color: "#5f8089" }}>
        {[
          codedTitle,
          prevSession ? `previous: Session ${prevSession.index} (${dayMonth(prevSession.scheduledAt)})` : "no earlier sessions",
          nextSession
            ? `next: Session ${nextSession.index} · ${meetsOn} ${dayMonth(nextSession.scheduledAt)} ${meetsAt}`
            : "this is the final session of the programme",
        ].join(" · ")}
      </div>
    </div>
  );
}
