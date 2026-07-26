"use client";

import dynamic from "next/dynamic";
import type { LiveRoomProps } from "./LiveRoom";

// Same reason as LiveRoomLazy: daily-js is browser-only and heavy.
const LiveRoomWithSim = dynamic(() => import("./LiveRoomWithSim"), {
  ssr: false,
  loading: () => (
    <div className="mt-4 rounded-2xl border grid place-items-center text-slate-400 text-sm" style={{ height: "80vh", borderColor: "#1e3a44" }}>
      Connecting to the room…
    </div>
  ),
});

export default function LiveRoomWithSimLazy(props: LiveRoomProps) {
  return <LiveRoomWithSim {...props} />;
}
