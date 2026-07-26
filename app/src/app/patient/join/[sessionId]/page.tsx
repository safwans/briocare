import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureRoom, mintToken } from "@/lib/daily";
import { asrMode } from "@/lib/asr";
import LiveRoom from "@/components/LiveRoomLazy";

export default async function PatientJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { sessionId } = await params;
  const { p } = await searchParams;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { cohort: { include: { enrollments: { include: { patient: true } } } } },
  });
  if (!session) notFound();

  const enrollment = p
    ? session.cohort.enrollments.find((e) => e.patientId === p)
    : session.cohort.enrollments[0];
  const patient = enrollment?.patient;

  const room = await ensureRoom(sessionId);
  const token = await mintToken({
    sessionId,
    isOwner: false,
    userName: patient ? patient.firstName : "Guest",
    userId: patient?.id ?? "guest",
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0e2029" }}>
      <div className="px-6 py-4 flex items-center gap-2 text-white">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#1c7b8c] text-sm font-bold">◎</span>
        <span className="font-bold">BrioCare</span>
      </div>

      <div className="flex-1 px-6 pb-6 max-w-3xl w-full mx-auto flex flex-col">
        <div className="text-center text-white mt-2 mb-4">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "#e8875a" }}>You&apos;re joining</div>
          <h1 className="text-xl font-bold">{session.cohort.name}</h1>
          <p className="text-sm mt-1" style={{ color: "#9fb6bb" }}>
            Your camera and mic stay off until you&apos;re ready. You can always pass when it&apos;s your turn.
          </p>
        </div>

        <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: "60vh" }}>
          <LiveRoom roomUrl={room.url} token={token} sessionId={sessionId} variant="patient" asrMode={asrMode()} onLeaveHref="/patient" />
        </div>
      </div>
    </div>
  );
}
