"use client";

import { useRef, useState } from "react";

/**
 * Hover explainer for the engagement metrics.
 *
 * Two things rule out both simpler options. A native `title` attribute has no visible affordance
 * and waits ~1s before appearing, so nobody discovers it. An absolutely-positioned panel gets
 * clipped, because the roster table it sits in is `overflow-hidden` to keep its rounded corners.
 * So the panel is `position: fixed`, placed from the trigger's viewport rect — outside every
 * clipping and stacking context on the page.
 */
export default function Tooltip({
  label,
  help,
  className = "",
}: {
  label: string;
  help: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // Flip under the trigger when there isn't room above, so a header near the top of the
    // viewport doesn't render the panel off-screen.
    const below = r.top < 190;
    setBox({ left: Math.min(Math.max(r.left, 12), window.innerWidth - 300), top: below ? r.bottom + 8 : r.top - 8, below });
  };

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setBox(null)}
      onFocus={show}
      onBlur={() => setBox(null)}
      tabIndex={0}
      className={`relative inline-flex items-center gap-1 cursor-help outline-none ${className}`}
    >
      {label}
      <span
        aria-hidden
        className="grid place-items-center w-[13px] h-[13px] rounded-full border text-[9px] font-bold leading-none shrink-0"
        style={{ borderColor: "#b7c4c9", color: "#7d8f97" }}
      >
        i
      </span>
      {box && (
        <span
          role="tooltip"
          className="fixed z-50 block w-[288px] rounded-xl px-3.5 py-2.5 text-[12.5px] font-normal normal-case tracking-normal leading-relaxed shadow-xl pointer-events-none"
          style={{
            left: box.left,
            top: box.top,
            transform: box.below ? "none" : "translateY(-100%)",
            background: "#14303a",
            color: "#dceaec",
          }}
        >
          {help}
        </span>
      )}
    </span>
  );
}
