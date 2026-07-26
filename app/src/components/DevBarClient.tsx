"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type Therapist = { id: string; name: string };
type Patient = { id: string; name: string; cohort: string };

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`;
}

export default function DevBarClient({
  therapists, patients, curClinician, curPatient,
}: {
  therapists: Therapist[];
  patients: Patient[];
  curClinician: string | null;
  curPatient: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<null | "landing" | "therapist" | "patient">(null);

  // Not on the sign-in screen. SHOW_DEV_BAR is set in the deployment, so without this the gate
  // renders under a bar advertising Therapist/Admin views to someone who hasn't signed in yet.
  // Hooks must run first, hence the early return here rather than at the top of the component.
  if (pathname === "/login") return null;

  // Two public landing pages with different audiences: "/" sells to parents, "/refer" sells to the
  // referral pipeline (ED discharge planners, inpatient social workers). Both count as "landing".
  const landings = [
    { href: "/", short: "Families", label: "For families", sub: "Parents — the enrolling buyer" },
    { href: "/refer", short: "Referrers", label: "For referrers", sub: "ED · inpatient · schools · pediatrics" },
  ];
  const curLanding = landings.find((l) => (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)));

  const section: "landing" | "admin" | "therapist" | "patient" | null = curLanding
    ? "landing"
    : pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/therapist")
    ? "therapist"
    : pathname.startsWith("/patient")
    ? "patient"
    : null;

  const go = (url: string) => { window.location.assign(url); };
  const pickTherapist = (id: string) => { setCookie("sim_clinician", id); go("/therapist"); };
  const pickPatient = (id: string) => { setCookie("sim_patient", id); go("/patient"); };

  const curTherapistName = therapists.find((t) => t.id === curClinician)?.name;
  const curPatientName = patients.find((p) => p.id === curPatient)?.name;

  const tab = (label: string, active: boolean) =>
    `px-3 py-1 rounded-md text-[13px] font-semibold ${active ? "bg-[#fde68a] text-[#713f12]" : "text-[#fff3d6] hover:bg-[#b45309]"}`;

  return (
    <div className="sticky top-0 z-[60] flex items-center gap-2 px-4 h-11 text-white" style={{ background: "#92400e", borderBottom: "1px solid #c2610c" }}>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#fcd34d" }}>🎬 Preview the app</span>
      <span className="text-[11px] font-medium hidden sm:inline" style={{ color: "#e9b872" }}>· switch view or simulate a user · dev only</span>

      {/* Right-aligned nav: Landing · Therapist · Patient · Admin */}
      <div className="ml-auto flex items-center gap-2">
      {/* Landing pages — parent-facing and referrer-facing */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => (o === "landing" ? null : "landing"))}
          className={tab("Landing page", section === "landing")}
        >
          Landing page{curLanding ? ` · ${curLanding.short}` : ""} ▾
        </button>
        {open === "landing" && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-[70] min-w-[240px] rounded-lg p-1.5 shadow-xl" style={{ background: "#0f2a33", border: "1px solid #1e4a56" }}>
            <div className="text-[10px] uppercase tracking-wider text-[#5f8089] px-2 py-1">Pick an audience</div>
            {landings.map((l) => (
              <button
                key={l.href}
                onClick={() => { setOpen(null); go(l.href); }}
                className={`w-full text-left px-2.5 py-2 rounded-md ${l === curLanding ? "bg-[#173e49]" : "hover:bg-[#173e49]"}`}
              >
                <div className={`text-[13px] ${l === curLanding ? "text-white" : "text-[#cfe0e2]"}`}>{l.label}</div>
                <div className="text-[11px] text-[#7f9aa1]">{l.sub}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Therapist */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => (o === "therapist" ? null : "therapist"))}
          className={tab("Therapist view", section === "therapist")}
        >
          Therapist view{curTherapistName ? ` · ${curTherapistName.replace(/^Dr\.?\s*/, "")}` : ""} ▾
        </button>
        {open === "therapist" && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-[70] min-w-[220px] rounded-lg p-1.5 shadow-xl" style={{ background: "#0f2a33", border: "1px solid #1e4a56" }}>
            <div className="text-[10px] uppercase tracking-wider text-[#5f8089] px-2 py-1">Pick a therapist</div>
            {therapists.length === 0 && <div className="px-2 py-2 text-[13px] text-[#8aa2a8]">None — seed data first.</div>}
            {therapists.map((t) => (
              <button
                key={t.id}
                onClick={() => { setOpen(null); pickTherapist(t.id); }}
                className={`w-full text-left px-2.5 py-2 rounded-md text-[13px] ${t.id === curClinician ? "bg-[#173e49] text-white" : "text-[#cfe0e2] hover:bg-[#173e49]"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Patient */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => (o === "patient" ? null : "patient"))}
          className={tab("Patient view", section === "patient")}
        >
          Patient view{curPatientName ? ` · ${curPatientName}` : ""} ▾
        </button>
        {open === "patient" && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-[70] min-w-[260px] max-h-[60vh] overflow-y-auto rounded-lg p-1.5 shadow-xl" style={{ background: "#0f2a33", border: "1px solid #1e4a56" }}>
            <div className="text-[10px] uppercase tracking-wider text-[#5f8089] px-2 py-1">Pick a patient</div>
            {patients.length === 0 && <div className="px-2 py-2 text-[13px] text-[#8aa2a8]">None — seed data first.</div>}
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => { setOpen(null); pickPatient(p.id); }}
                className={`w-full text-left px-2.5 py-2 rounded-md ${p.id === curPatient ? "bg-[#173e49]" : "hover:bg-[#173e49]"}`}
              >
                <div className={`text-[13px] ${p.id === curPatient ? "text-white" : "text-[#cfe0e2]"}`}>{p.name}</div>
                <div className="text-[11px] text-[#7f9aa1]">{p.cohort}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Admin */}
      <button onClick={() => go("/admin")} className={tab("Admin", section === "admin")}>Admin</button>
      </div>
    </div>
  );
}
