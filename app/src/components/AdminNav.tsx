"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Counts = { therapists: number; cohorts: number; patients: number; sessions: number };

const ITEMS = [
  { href: "/admin", label: "Overview", key: "overview" as const },
  // Ordered to match how a cohort is actually assembled: a therapist and members exist first,
  // then you group them into a cohort.
  { href: "/admin/therapists", label: "Therapists", key: "therapists" as const },
  { href: "/admin/patients", label: "Patients", key: "patients" as const },
  { href: "/admin/cohorts", label: "Cohorts", key: "cohorts" as const },
  { href: "/admin/sessions", label: "Sessions", key: "sessions" as const },
];

export default function AdminNav({ counts }: { counts: Counts }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <nav className="flex flex-col gap-[3px]">
      {ITEMS.map((it) => {
        const on = active(it.href);
        const count = it.key === "overview" ? null : counts[it.key];
        return (
          <Link
            key={it.key}
            href={it.href}
            className={`flex items-center text-[14.5px] font-semibold px-3 py-2.5 rounded-lg ${on ? "bg-[#1c505a] text-white" : "text-[#9fbcc2] hover:text-white"}`}
          >
            {it.label}
            {count != null && (
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0d3038] text-[#7fd0dc]">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
