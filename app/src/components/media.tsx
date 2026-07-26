"use client";

import { useEffect, useRef } from "react";

// Attaching a MediaStreamTrack to an element, shared by the live room and the floating self-view.
//
// Lives in its own client module rather than parts.tsx: that file carries no "use client" and is
// imported by Server Components, so a hook-using component there would drag the whole module —
// focusLabel, StatusChip — across the client boundary. Importing from LiveRoom instead would be a
// cycle, since LiveRoom imports useLiveSession from LiveSession.
//
// The refs are deliberately useRef + useEffect keyed on [track], NOT an inline ref callback:
// React re-invokes a ref callback on every commit where its identity changes, and an inline arrow
// is a new function each render. That reassigns srcObject on every render — which restarts the
// element and shows a black frame. Harmless at rest, but the self-view re-renders ~4x/second off
// the mic-level observer, so it flashed continuously.

/** Attaches a video track to a <video> element. */
export function Video({ track, muted, className }: { track: MediaStreamTrack; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    void el.play().catch(() => {});
    return () => { if (el) el.srcObject = null; };
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
}

/** Plays a remote audio track (call-object mode does not auto-play remote audio). */
export function Audio({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
    void el.play().catch(() => {});
    return () => { if (el) el.srcObject = null; };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}
