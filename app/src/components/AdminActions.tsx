"use client";

import { useState, useTransition } from "react";
import { seedDemoAction, resetAllAction, genCohortAction, genTherapistAction, genLoosePatientsAction, setDirectorModelAction } from "@/lib/admin-actions";

export function SidebarActions() {
  const [pending, start] = useTransition();
  return (
    <div className="mt-auto flex flex-col gap-2">
      <button
        onClick={() => start(() => seedDemoAction())}
        disabled={pending}
        className="rounded-[10px] py-2.5 text-[13.5px] font-bold disabled:opacity-50"
        style={{ background: "#2fa4b8", color: "#06222b" }}
      >
        ⚡ Seed full demo dataset
      </button>
      <button
        onClick={() => { if (confirm("Delete ALL data? This cannot be undone.")) start(() => resetAllAction()); }}
        disabled={pending}
        className="rounded-[10px] py-2 text-[13px] font-semibold border border-[#29525c] text-[#9fbcc2] disabled:opacity-50"
      >
        Reset everything
      </button>
    </div>
  );
}

export function CohortGenerator({ therapists = [] }: { therapists?: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  // Pre-filled tracks Sessions instead of sitting at a fixed number: a static default of 5 against
  // a 3-session cohort generated one with nothing left to run. Held at all-but-one unless the
  // operator overrides it, and capped so it can never swallow the whole programme.
  const [sessions, setSessions] = useState(6);
  const [preFilled, setPreFilled] = useState<number | null>(null);
  const maxPre = Math.max(0, sessions - 1);
  const preValue = Math.min(preFilled ?? maxPre, maxPre);
  return (
    <form
      action={(fd) => start(() => genCohortAction(fd))}
      className="flex flex-wrap items-end gap-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Cohort name (optional)</span>
        <input name="name" placeholder="e.g. Wednesday PM · Mood" className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-56 focus:outline-none focus:border-[#2fa4b8]" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Therapist</span>
        <select name="clinicianId" className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-52 bg-white focus:outline-none focus:border-[#2fa4b8]">
          {therapists.length === 0 && <option value="">Auto (creates one)</option>}
          {therapists.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Focus</span>
        <select name="focus" defaultValue="SOCIAL_ANXIETY" className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-48 bg-white focus:outline-none focus:border-[#2fa4b8]">
          <option value="SOCIAL_ANXIETY">Social Anxiety</option>
          <option value="MOOD_DEPRESSION">Mood &amp; Depression</option>
          <option value="EMOTION_REGULATION">Emotion Regulation</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Meets on</span>
        <select name="meetsOn" defaultValue="Monday" className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-32 bg-white focus:outline-none focus:border-[#2fa4b8]">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Time</span>
        <select name="meetsAt" defaultValue="4:00 PM" className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-28 bg-white focus:outline-none focus:border-[#2fa4b8]">
          {["9:00 AM", "10:00 AM", "11:30 AM", "1:00 PM", "3:00 PM", "4:00 PM", "5:30 PM", "6:30 PM"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Patients</span>
        <input name="patients" type="number" defaultValue={6} min={3} max={12} className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-20 focus:outline-none focus:border-[#2fa4b8]" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]">Sessions</span>
        <input
          name="sessions" type="number" min={3} max={12}
          value={sessions}
          onChange={(e) => setSessions(Math.max(3, Math.min(12, Number(e.target.value) || 3)))}
          className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-20 focus:outline-none focus:border-[#2fa4b8]"
        />
      </label>
      {/* Splits "how long is the programme" from "how much of it has already happened", so
          6 sessions with 4 pre-filled leaves exactly 2 to run rather than growing forever. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#5f727a]" title="Sessions generated as completed history. The rest are left to run.">Pre-filled</span>
        <input
          name="preGenerated" type="number" min={0} max={maxPre}
          value={preValue}
          onChange={(e) => setPreFilled(Math.max(0, Math.min(maxPre, Number(e.target.value) || 0)))}
          className="rounded-lg border border-[#e2e8ea] px-3 py-2 text-sm w-20 focus:outline-none focus:border-[#2fa4b8]"
        />
      </label>
      <div className="text-xs text-[#5f727a] pb-2.5">
        {sessions - preValue} of {sessions} left to run
      </div>
      <button disabled={pending} className="rounded-[11px] px-5 py-2.5 text-[14.5px] font-bold text-white disabled:opacity-50" style={{ background: "#135463" }}>
        {pending ? "Generating…" : "Generate cohort"}
      </button>
    </form>
  );
}

export function QuickAddButtons() {
  const [pending, start] = useTransition();
  // How many unassigned patients to mint. Was hardcoded to 5, which made it a chore to build a
  // roster of any other size.
  const [looseCount, setLooseCount] = useState(5);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        onClick={() => start(() => genTherapistAction())}
        disabled={pending}
        className="text-left rounded-[13px] p-4 bg-white border border-[#e2e8ea] disabled:opacity-50"
      >
        <div className="font-bold text-[15px] text-[#182226]">+ Add a therapist</div>
        <div className="text-[13px] text-[#5f727a]">Random name, credential, and email</div>
      </button>
      <div className="flex items-center gap-3 rounded-[13px] p-4 bg-white border border-[#e2e8ea]">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[#5f727a]">How many</span>
          <input
            type="number"
            min={1}
            max={20}
            value={looseCount}
            onChange={(e) => setLooseCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="rounded-lg border border-[#e2e8ea] px-2.5 py-1.5 text-sm w-[68px] focus:outline-none focus:border-[#2fa4b8]"
          />
        </label>
        <button
          onClick={() => start(() => genLoosePatientsAction(looseCount))}
          disabled={pending}
          className="text-left disabled:opacity-50"
        >
          <div className="font-bold text-[15px] text-[#182226]">
            + Add {looseCount} unassigned patient{looseCount === 1 ? "" : "s"}
          </div>
          <div className="text-[13px] text-[#5f727a]">Enroll into a cohort later</div>
        </button>
      </div>
    </div>
  );
}

type DirectorModelOpt = { id: string; label: string; price: string; note: string };

/** Radio list for the AI-patient director model. Saves immediately on pick. */
export function DirectorModelPicker({ models, current }: { models: DirectorModelOpt[]; current: string }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-col gap-2 ${pending ? "opacity-60" : ""}`}>
      {models.map((m) => {
        const on = m.id === current;
        return (
          <button
            key={m.id}
            disabled={pending}
            onClick={() => {
              if (on) return;
              const fd = new FormData();
              fd.set("model", m.id);
              start(() => setDirectorModelAction(fd));
            }}
            className="flex items-start gap-3 rounded-[11px] border px-4 py-3 text-left disabled:cursor-default"
            style={{
              borderColor: on ? "#2fa4b8" : "#e2e8ea",
              background: on ? "#eef7f8" : "#ffffff",
            }}
          >
            <span
              className="mt-[3px] w-[15px] h-[15px] rounded-full shrink-0 grid place-items-center"
              style={{ border: `2px solid ${on ? "#1c7b8c" : "#c6d2d5"}` }}
            >
              {on && <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#1c7b8c" }} />}
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-[14.5px] text-[#182226]">{m.label}</span>
                <code className="text-[11.5px] text-[#5f727a]">{m.id}</code>
                <span className="text-[12px] text-[#5f727a]">{m.price}</span>
              </span>
              <span className="block text-[13px] text-[#5f727a] mt-0.5">{m.note}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
