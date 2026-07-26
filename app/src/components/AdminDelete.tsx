"use client";

import { useState, useTransition } from "react";
import { deleteCohortAction, deletePatientAction, deleteTherapistAction } from "@/lib/admin-actions";

type Kind = "cohort" | "patient" | "therapist";

const ACTION: Record<Kind, (id: string) => Promise<void>> = {
  cohort: deleteCohortAction,
  patient: deletePatientAction,
  therapist: deleteTherapistAction,
};

// Deleting a cohort or a patient takes real clinical history with it, so the confirm spells out
// what goes rather than asking a generic "are you sure?".
const WARNING: Record<Kind, string> = {
  cohort: "Delete this cohort? Its sessions, notes, and engagement history go with it. Members are kept and become unassigned.",
  patient: "Delete this patient? Their notes, engagement history, and enrollment go with them.",
  therapist: "Delete this therapist?",
};

/** Row-level delete for the admin console. Gated server-side by adminToolsEnabled(). */
export default function DeleteRowButton({ kind, id, label }: { kind: Kind; id: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        aria-label={`Delete ${label}`}
        disabled={pending}
        onClick={() => {
          if (!confirm(`${WARNING[kind]}\n\n${label}`)) return;
          setError(null);
          start(async () => {
            try {
              await ACTION[kind](id);
            } catch (e) {
              // deleteTherapist() refuses while cohorts remain — surface that, don't swallow it.
              setError(e instanceof Error ? e.message : "Delete failed.");
            }
          });
        }}
        className="text-[12.5px] font-semibold text-[#a3535a] hover:text-[#7d3b41] disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-[11.5px] text-[#a3535a] max-w-[240px] text-right">{error}</span>}
    </div>
  );
}
