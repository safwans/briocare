"use client";

import { useState } from "react";
import Link from "next/link";

const MOODS = [
  { label: "Really good", color: "#3f9a7d" },
  { label: "Okay", color: "#7fd0dc" },
  { label: "Kind of meh", color: "#e6c15a" },
  { label: "Not great", color: "#f6a97f" },
  { label: "Struggling", color: "#ef7d5a" },
];

export default function CheckinFlow({ groupHref }: { groupHref: string }) {
  const [mood, setMood] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="w-20 h-20 rounded-full grid place-items-center mb-6" style={{ background: MOODS[mood ?? 1].color }}>
          <span className="w-8 h-8 rounded-full bg-white/90" />
        </div>
        <div className="text-2xl font-bold tracking-tight mb-2 text-[#243b34]">Thanks for checking in</div>
        <p className="text-[15px] leading-relaxed text-[#52655f] max-w-xs mb-7">This is just for you — it helps you notice how you&apos;re doing. See you in group.</p>
        <Link href={groupHref} className="rounded-2xl px-8 py-3.5 font-bold text-white" style={{ background: "#135463" }}>Go to group</Link>
        <button onClick={() => { setDone(false); setMood(null); }} className="mt-2 text-sm font-semibold text-[#7c8f89] py-3">Change my answer</button>
      </div>
    );
  }

  return (
    <div className="pt-1 text-[#243b34]">
      <div className="text-sm text-[#7c8f89] mb-1">Private check-in</div>
      <div className="text-2xl font-bold tracking-tight leading-tight mb-6">How are you feeling right now?</div>
      <div className="flex flex-col gap-3">
        {MOODS.map((m, i) => (
          <button
            key={i}
            onClick={() => setMood(i)}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border text-left ${mood === i ? "border-[#2fa4b8] bg-white" : "border-[#ece3d6] bg-white/60"}`}
          >
            <span className="w-7 h-7 rounded-full shrink-0" style={{ background: m.color }} />
            <span className="font-semibold text-base">{m.label}</span>
            {mood === i && <span className="ml-auto font-bold" style={{ color: m.color }}>✓</span>}
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-white border border-[#ece3d6] p-4">
        <div className="text-[13px] font-semibold text-[#7c8f89] mb-1.5">Anything on your mind? (optional)</div>
        <textarea rows={2} placeholder="Type a few words…" className="w-full text-sm text-[#243b34] placeholder-[#b6ab99] focus:outline-none resize-none bg-transparent" />
      </div>
      <button
        onClick={() => mood != null && setDone(true)}
        disabled={mood == null}
        className="w-full mt-5 rounded-2xl px-6 py-3.5 font-bold text-white disabled:opacity-50"
        style={{ background: "#135463" }}
      >
        Done
      </button>
    </div>
  );
}
