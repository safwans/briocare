"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/patient", label: "Home", key: "home" },
  { href: "/patient/group", label: "Group", key: "group" },
  { href: "/patient/practice", label: "Practice", key: "practice" },
];

function activeKey(pathname: string): string {
  if (pathname.startsWith("/patient/group")) return "group";
  if (pathname.startsWith("/patient/practice")) return "practice";
  if (pathname.startsWith("/patient/checkin")) return "home";
  return "home";
}

export default function PatientTabs({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const active = activeKey(pathname);

  if (variant === "top") {
    return (
      <nav className="flex items-center gap-1">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${active === t.key ? "bg-[#e9efe8] text-[#135463]" : "text-[#7c8f89] hover:text-[#135463]"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-[#ece3d6] flex justify-around px-6 pt-2 pb-6 z-30">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className={`flex flex-col items-center gap-1 text-[11px] font-semibold ${active === t.key ? "text-[#135463]" : "text-[#9fb0a9]"}`}>
          <span className={`w-5 h-5 rounded-md border-2 ${active === t.key ? "border-[#135463]" : "border-[#9fb0a9]"}`} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
