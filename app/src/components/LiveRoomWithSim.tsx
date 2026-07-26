"use client";

import LiveRoom, { type LiveRoomProps } from "./LiveRoom";
import { SimProvider, SimStatusBar, SimTileButton } from "./SimPatients";

// DEV ONLY wrapper: the live room plus the AI-patient simulator. This has to be a client component
// because `tileAction` is a function prop, which can't cross the server → client boundary.
export default function LiveRoomWithSim(props: LiveRoomProps) {
  return (
    <SimProvider sessionId={props.sessionId}>
      <div className="mt-4 rounded-2xl overflow-hidden border" style={{ height: "80vh", borderColor: "#1e3a44" }}>
        <LiveRoom
          {...props}
          tileAction={(member, joined) => <SimTileButton patientId={member.patientId} joined={joined} />}
        />
      </div>
      <SimStatusBar />
    </SimProvider>
  );
}
