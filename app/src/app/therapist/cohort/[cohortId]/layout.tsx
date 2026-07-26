import { prisma } from "@/lib/db";
import SessionStatusBar from "@/components/SessionStatusBar";

// Wraps all cohort-scoped screens; shows the live session status bar (hidden inside the room).
export default async function CohortLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ cohortId: string }>;
}) {
  const { cohortId } = await params;
  const live = await prisma.session.findFirst({ where: { cohortId, status: "LIVE" }, select: { id: true, index: true } });
  return (
    <>
      <SessionStatusBar cohortId={cohortId} liveSessionId={live?.id ?? null} liveSessionIndex={live?.index ?? null} />
      {children}
    </>
  );
}
