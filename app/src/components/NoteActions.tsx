"use client";

import { useState } from "react";
import { approveNote } from "@/lib/actions";

// Clinician attestation gate + approve + copy-for-EHR, matching the mock's note-review actions.
export default function NoteActions({
  noteId, approvable, blockedReason, ehrText,
}: {
  noteId: string;
  approvable: boolean;
  blockedReason: string | null;
  ehrText: string;
}) {
  const [attesting, setAttesting] = useState(false);
  const [attested, setAttested] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ehrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="mt-4">
      {attesting && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: "#eef7f4", border: "1.5px solid #b6dccb" }}>
          <div className="font-bold text-[#1f5c47] mb-3">Clinician attestation</div>
          <label className="flex gap-3 items-start cursor-pointer">
            <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1" />
            <span className="text-sm text-[#2e5b4c] leading-relaxed">
              I reviewed this note and edited it as needed. It reflects my clinical judgment, and I am filing it under my license.
            </span>
          </label>
          <div className="flex gap-2 mt-4">
            <form action={approveNote}>
              <input type="hidden" name="noteId" value={noteId} />
              <button
                disabled={!attested}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed"
                style={{ background: attested ? "#2f8f6f" : "#c3d0d2" }}
              >
                Confirm &amp; file
              </button>
            </form>
            <button onClick={() => setAttesting(false)} className="text-sm font-medium text-slate-500 px-3">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => setAttesting(true)}
          disabled={!approvable}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed"
          style={{ background: approvable ? "#1c6b78" : "#c3d0d2" }}
        >
          Approve &amp; sign off
        </button>
        <button onClick={copy} className="text-sm font-medium text-slate-500 hover:text-slate-700 ml-auto">
          {copied ? "Copied ✓" : "Copy for EHR"}
        </button>
      </div>
      {blockedReason && <div className="text-xs mt-2" style={{ color: "#b8556a" }}>{blockedReason}</div>}
    </div>
  );
}
