import { getPatientGroup } from "@/lib/patient";
import { ensureRoom, mintToken } from "@/lib/daily";
import { asrMode } from "@/lib/asr";
import GroupExperience from "@/components/GroupExperience";

export default async function GroupPage() {
  const group = await getPatientGroup();
  if (!group) return <div className="max-w-md mx-auto px-5 py-10 text-center text-[#7c8f89]">No enrollment found.</div>;

  let roomUrl: string | null = null;
  let token: string | null = null;
  // Only provision a room once the therapist has actually started the session. getPatientGroup
  // falls back to the next SCHEDULED session so the lobby can say when group meets — joining that
  // would put the teen alone in a room named after a session nobody has started, which is why the
  // facilitator tile sat on "Your therapist will appear here" forever.
  if (group.sessionId && group.live) {
    try {
      const room = await ensureRoom(group.sessionId);
      roomUrl = room.url;
      token = await mintToken({
        sessionId: group.sessionId,
        isOwner: false,
        userName: group.patientName,
        userId: group.patientId,
      });
    } catch {
      roomUrl = null;
      token = null;
    }
  }

  return (
    <GroupExperience
      patientId={group.patientId}
      patientName={group.patientName}
      groupLabel={group.groupLabel}
      therapistName={group.therapistName}
      therapistInitials={group.therapistInitials}
      sessionId={group.sessionId}
      live={group.live}
      roster={group.roster}
      roomUrl={roomUrl}
      token={token}
      asrMode={asrMode()}
    />
  );
}
