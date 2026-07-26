import Link from "next/link";
import { getDashboard, type CohortCard, type CohortSessionState } from "@/lib/queries";
import { focusLabel } from "@/components/parts";

// Pill, accent and CTA for each card state, kept in one table so they can't drift apart.
// Colours are lifted from mocks/BrioCare Therapist.html.
const STATE_META: Record<
  CohortSessionState,
  { pill: string; pillBg: string; pillInk: string; accent: string; cta: string; ctaBg: string }
> = {
  live:         { pill: "LIVE NOW",  pillBg: "#c1445b", pillInk: "#fff",    accent: "#c1445b", cta: "Return to room", ctaBg: "#c1445b" },
  upcoming:     { pill: "UPCOMING",  pillBg: "#6bc6d6", pillInk: "#0b2830", accent: "#2fa4b8", cta: "Open cohort",    ctaBg: "#135463" },
  "notes-due":  { pill: "NOTES DUE", pillBg: "#e8c05a", pillInk: "#3a3016", accent: "#c2883a", cta: "Review notes",   ctaBg: "#c2883a" },
};

export default async function TherapistDashboard() {
  const dash = await getDashboard();
  if (!dash) {
    return <div className="p-10 text-slate-500">No clinician seeded. Run <code>pnpm prisma db seed</code>.</div>;
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const groups = `${dash.totals.cohorts} ${dash.totals.cohorts === 1 ? "group" : "groups"}`;

  return (
    <div className="px-10 pt-[30px] pb-15">
      <div className="text-[13px] font-semibold text-[#9fb2b7]">{today}</div>
      <h1 className="text-[29px] font-bold tracking-tight mt-1">Good afternoon, {dash.clinicianName}</h1>
      <p className="text-[15px] text-[#6d828a] mt-1 max-w-3xl">
        {`Where each of your ${groups} stands right now — they meet on different days, so status is what matters here, not the calendar.`}
      </p>

      {/* Stat row — grouped by what the therapist is meant to do with each number, rather than one
          undifferentiated strip of counts. */}
      <div className="mt-6 grid grid-cols-[2fr_2fr_1.15fr] gap-[26px] items-start">
        <div>
          <Eyebrow color="#9fb2b7">Happening now</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            <StatTile n={dash.topCounts.live} label="session live now" bg="#12303a" numColor="#fff" labelColor="#9db8bd" />
            <StatTile n={dash.topCounts.upcoming} label="upcoming next" numColor="#1c7b8c" />
          </div>
        </div>

        <div>
          <Eyebrow color="#b8556a">Needs you</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            <StatTile n={dash.topCounts.notes} label="notes to review" numColor="#b06a1e" leftBorder="#c2883a" />
            {/* "members at risk" (still the wording in the mock) breaks the copy rule in status.ts —
                display never says "at risk". The count is members whose status is CHECK_IN, which
                renders as "Check in" everywhere else. */}
            <StatTile n={dash.topCounts.checkIns} label="members to check in" numColor="#b8556a" leftBorder="#b8556a" />
          </div>
        </div>

        <div>
          <Eyebrow color="#9fb2b7">Your caseload</Eyebrow>
          <div className="rounded-[14px] border border-[#dde8e9] bg-[#eef4f4] px-5 py-[18px]">
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-bold text-[#135463] leading-none">{dash.totals.members}</span>
              <span className="text-[13px] text-[#6d828a]">members</span>
            </div>
            <div className="text-[13px] text-[#6d828a] mt-0.5">across {groups}</div>
          </div>
        </div>
      </div>

      {/* Cohort cards */}
      <div className="mt-[30px] text-xs font-semibold uppercase tracking-[0.05em] text-[#6d828a]">Your cohorts</div>
      <div className="mt-3.5 flex flex-col gap-3.5">
        {dash.cohorts.map((c) => (
          <CohortRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

function CohortRow({ c }: { c: CohortCard }) {
  const m = STATE_META[c.sessionState];
  const href =
    c.sessionState === "live" && c.liveSessionId
      ? `/therapist/cohort/${c.id}/live/${c.liveSessionId}`
      : c.sessionState === "notes-due"
        ? `/therapist/cohort/${c.id}/notes`
        : `/therapist/cohort/${c.id}`;

  // Session.index is already 1-based, so the live/next index is the session number as-is.
  const sessionLine =
    c.sessionState === "live"
      ? `S${c.liveSession?.index ?? c.latestIndex ?? 1} of ${c.totalSessions} · in progress`
      : c.sessionState === "upcoming" && c.nextIndex
        ? `S${c.nextIndex} of ${c.totalSessions} · ${c.meetsAt}`
        : c.latestIndex
          ? `S${c.latestIndex} of ${c.totalSessions} · complete`
          : "—";

  const attn =
    c.checkIns > 0
      ? { text: `${c.checkIns} to check in${c.notesToReview > 0 ? ` · ${c.notesToReview} notes` : ""}`, color: "#b8556a" }
      : c.notesToReview > 0
        ? { text: `${c.notesToReview} notes to review`, color: "#b06a1e" }
        : { text: "All clear", color: "#3f9a7d" };

  return (
    <Link
      href={href}
      className="block rounded-2xl bg-white border border-[#e0e9ea] hover:border-slate-300 transition-colors"
      style={{ borderLeft: `4px solid ${m.accent}` }}
    >
      <div className="px-6 py-5 flex items-center gap-6">
        <div className="min-w-[230px]">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-bold tracking-[0.05em]"
            style={{ background: m.pillBg, color: m.pillInk }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${c.sessionState === "live" ? "animate-pulse" : ""}`}
              style={{ background: m.pillInk }}
            />
            {m.pill}
          </span>
          <div className="mt-1 font-bold text-[19px] tracking-tight">{c.name}</div>
          <div className="text-[13px] text-[#9fb2b7] mt-0.5">
            Meets {c.meetsOn}s · {c.meetsAt} · {c.members} members
          </div>
        </div>
        <div className="flex-1 flex gap-7">
          <Field label="Session" value={sessionLine} />
          <Field label="Focus" value={c.module || focusLabel(c.focus)} />
          <div>
            <div className="text-xs text-[#9fb2b7] mb-[3px]">Needs attention</div>
            <div className="text-[15px] font-semibold" style={{ color: attn.color }}>{attn.text}</div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-[11px] px-5 py-[11px] text-sm font-bold text-white whitespace-nowrap"
          style={{ background: m.ctaBg }}
        >
          {m.cta}
        </span>
      </div>
    </Link>
  );
}

function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.07em] mb-[9px]" style={{ color }}>
      {children}
    </div>
  );
}

function StatTile({
  n, label, bg = "#fff", numColor, labelColor = "#6d828a", leftBorder,
}: {
  n: number; label: string; bg?: string; numColor: string; labelColor?: string; leftBorder?: string;
}) {
  return (
    <div
      className="rounded-[14px] px-5 py-[18px]"
      style={{
        background: bg,
        border: bg === "#fff" ? "1px solid #e0e9ea" : "none",
        ...(leftBorder ? { borderLeft: `3px solid ${leftBorder}` } : {}),
      }}
    >
      <div className="text-[30px] font-bold leading-none" style={{ color: numColor }}>{n}</div>
      <div className="text-[13px] mt-1" style={{ color: labelColor }}>{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[#9fb2b7] mb-[3px]">{label}</div>
      <div className="text-[15px] font-semibold text-[#24343b]">{value}</div>
    </div>
  );
}
