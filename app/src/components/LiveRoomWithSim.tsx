"use client";

import LiveRoom, { type LiveRoomProps } from "./LiveRoom";
import { SimProvider, SimTileButton, useSim } from "./SimPatients";

// DEV ONLY wrapper: the live room plus the AI-patient simulator. This has to be a client component
// because `tileAction` is a function prop, which can't cross the server → client boundary.
export default function LiveRoomWithSim(props: LiveRoomProps) {
  return (
    <SimProvider sessionId={props.sessionId}>
      <SimRoom {...props} />
    </SimProvider>
  );
}

// Inner component so it can read the simulator context that SimProvider above it supplies.
function SimRoom(props: LiveRoomProps) {
  const { active, error } = useSim();
  return (
    <>
      {/* No height/border wrapper — the facilitator view owns its room card and renders the
          transcript as its own section underneath it. */}
      <div className="mt-4">
        <LiveRoom
          {...props}
          simulatedIds={active}
          tileAction={(member, joined) => <SimTileButton patientId={member.patientId} joined={joined} />}
        />
      </div>
      {/* The simulator's status strip is gone — which teens are AI is now shown by the "AI" tag on
          their transcript lines, and each bot is added or removed from its own tile. Only failures
          still need a home: a bot that can't join or speak would otherwise fail silently, and the
          clinician would be left waiting on an answer that is never coming. */}
      {error && (
        <div className="mt-3 rounded-xl px-4 py-3 text-[12.5px]" style={{ background: "#3a1f26", border: "1px solid #6b3543", color: "#f0a3b1" }}>
          AI patient simulator: {error}
        </div>
      )}
    </>
  );
}
