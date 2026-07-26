"use client";

import dynamic from "next/dynamic";
import type { LiveRoomProps } from "./LiveRoom";

// Daily's daily-js is browser-only (touches window) and heavy; load it as a client-only lazy
// chunk (ssr:false) to avoid SSR + a Turbopack RSC-client chunk build issue.
const LiveRoom = dynamic(() => import("./LiveRoom"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full grid place-items-center text-slate-400 text-sm">Connecting to the room…</div>
  ),
});

export default function LiveRoomLazy(props: LiveRoomProps) {
  return <LiveRoom {...props} />;
}
