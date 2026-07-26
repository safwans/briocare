import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrioCare for referring providers",
  description:
    "Virtual teen IOP for anxiety and depression. Reserved capacity, same-week admission, and outcomes reported back to your unit.",
};

// Second public marketing page, aimed at the referral pipeline rather than parents (docs/prd.md,
// risk 4: demand here is a B2B2C referral machine, not a DTC ad problem). Audience is ED discharge
// planners and inpatient social workers first, school counselors and PCPs second. Same visual
// system as the parent landing page in ../page.tsx — palette hexes are inlined from
// the marketing design mock there, and repeated here so the two read as one site.
export default function ReferLandingPage() {
  return (
    <div style={{ background: "#faf6ef", color: "#243b34" }}>
      {/* Announcement */}
      <div className="text-center text-[13px] font-medium py-2 px-4" style={{ background: "#0f333b", color: "#cfe9ee" }}>
        Reserved seats open for ED and inpatient step-down partners —{" "}
        <a href="#partner" className="font-bold" style={{ color: "#f6a97f" }}>set up a pathway →</a>
      </div>

      {/* Nav */}
      <header className="max-w-6xl mx-auto flex items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid place-items-center w-8 h-8 rounded-lg text-white font-bold" style={{ background: "#1c7b8c" }}>◎</span>
          <span className="font-bold text-xl tracking-tight" style={{ color: "#14303a" }}>BrioCare</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#52655f] ml-4">
          <a href="#capacity" className="hover:text-[#135463]">Capacity</a>
          <a href="#criteria" className="hover:text-[#135463]">Who to refer</a>
          <a href="#how" className="hover:text-[#135463]">How to refer</a>
          <a href="#outcomes" className="hover:text-[#135463]">Outcomes</a>
        </nav>
        <a href="#refer" className="ml-auto rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#135463" }}>Start a referral</a>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold mb-5" style={{ color: "#c96b45" }}>
            <span className="uppercase tracking-wider">For referring providers</span>
            <span style={{ color: "#cdd8d6" }}>|</span>
            <span className="text-[#52655f]">ED · inpatient step-down · schools · pediatrics</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-5" style={{ color: "#14303a" }}>
            A start date,<br />not a phone list.
          </h1>
          <p className="text-[17px] leading-relaxed text-[#52655f] max-w-xl mb-7">
            Discharge the teen with a confirmed first session instead of a page of numbers to call.
            BrioCare is a virtual intensive outpatient program for ages 14–17 with moderate-to-high-acuity
            anxiety and depression. Partner units get reserved seats, same-week admission, and outcomes
            reported back — so you know what happened to the patient you sent.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#refer" className="rounded-2xl px-6 py-3.5 font-bold text-white" style={{ background: "#ef7d5a" }}>Start a referral</a>
            <a href="#partner" className="rounded-2xl px-6 py-3.5 font-bold" style={{ border: "1.5px solid #cdd8d6", color: "#135463" }}>Set up a pathway</a>
          </div>
          <p className="text-[13px] text-[#7c8f89] mt-5 max-w-md">
            Licensed clinicians in your state. HIPAA-private, telehealth, no PHI required to open a conversation.
          </p>
        </div>

        {/* Hero visual — the referral tracker a partner sees. Deliberately not the live-room mock used
            on the parent page: what a discharge planner buys is the closed loop, not the session. */}
        <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(160deg,#1b4d58,#0f333b)" }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#7fd0dc" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#ef7d5a" }} />Referral · Metro Children&apos;s ED
          </div>
          <div className="flex flex-col gap-2.5">
            {([
              ["Referral received", "Mon 4:12 pm", "Secure intake, ROI on file", true],
              ["Screened for fit", "Mon 6:40 pm", "14–17 · anxiety/depression · IOP level", true],
              ["Seat confirmed", "Tue 9:05 am", "Reserved block — Tuesday cohort", true],
              ["First session", "Thu 4:00 pm", "3 days from discharge", false],
            ] as [string, string, string, boolean][]).map(([step, when, detail, done]) => (
              <div key={step} className="rounded-xl p-3 flex items-start gap-3" style={{ background: "#132e37", border: "1px solid #21454f" }}>
                <span
                  className="mt-0.5 w-5 h-5 shrink-0 rounded-full grid place-items-center text-[11px] font-bold"
                  style={done ? { background: "#2fa4b8", color: "#06222a" } : { border: "1.5px solid #ef7d5a", color: "#f6a97f" }}
                >
                  {done ? "✓" : "→"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13px] font-semibold" style={{ color: "#eaf6f7" }}>{step}</span>
                    <span className="text-[11px]" style={{ color: "#7fa7ae" }}>{when}</span>
                  </div>
                  <div className="text-[12px] leading-snug" style={{ color: "#a9d2d8" }}>{detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl px-3 py-2.5 text-[12px] flex items-center justify-between" style={{ background: "#12303a", color: "#a9d2d8" }}>
            <span>Outcomes report back to referrer</span>
            <span className="font-semibold" style={{ color: "#7fd0dc" }}>at discharge + quarterly</span>
          </div>
          <p className="text-[11px] mt-3" style={{ color: "#6a8b93" }}>Illustrative — sample partner view, not patient data.</p>
        </div>
      </section>

      {/* The three things a partner is actually promised (docs/prd.md risk 4: "reserved capacity,
          same-week admission, and outcomes reported back to the referrer"). */}
      <section id="capacity" className="py-14" style={{ background: "#0f333b" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7fd0dc" }}>What we commit to partners</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Three commitments, in writing.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {([
              [
                "Reserved capacity",
                "A standing block of seats held for your unit each cohort cycle, agreed up front — not first-come, first-served against everyone else's referrals. If your volume shifts, the block moves with it.",
              ],
              [
                "Same-week admission",
                "Screened for fit the same business day we receive the referral, seat confirmed the next morning, first group inside the same week. You discharge with a date and time, not a number to call.",
              ],
              [
                "Outcomes reported back",
                "A discharge summary on every patient you send, plus a quarterly report across your referrals: admission rate, time from referral to first session, attendance, completion, and screener change.",
              ],
            ] as [string, string][]).map(([title, body]) => (
              <div key={title} className="rounded-2xl p-6" style={{ background: "#12414b", border: "1px solid #1e4a56" }}>
                <div className="w-10 h-10 rounded-xl mb-4" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)" }} />
                <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "#a9d2d8" }}>{body}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed mt-6 max-w-3xl mx-auto text-center" style={{ color: "#7fa7ae" }}>
            Seat counts, escalation contacts, and reporting cadence are set per partner during pathway
            setup and written into the agreement. BrioCare is early — these are the terms we sign, not
            claims about volume we have already run.
          </p>
        </div>
      </section>

      {/* Referrer-side pains. Same worry/answer card pattern as the parent page, but the worries are
          the discharge planner's (docs/prd.md: "discharged with a list of numbers", weeks-long
          waitlists, and the outcomes loop back to the referrer that "quietly just doesn't happen"). */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c96b45" }}>If this sounds familiar</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>The handoff is where care breaks.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {([
            [
              "“I hand the family a list of programs and never find out whether anyone picked up.”",
              "Every referral gets an acknowledgement, a named coordinator, and a confirmed first-session date — back to you, not just to the family. At discharge you get a summary of what we did and how it went.",
            ],
            [
              "“Every program says they have room, then it's a three-week wait and the kid bounces back.”",
              "Your seats are reserved before the referral exists. Screening happens the same business day and the first group is inside the week, so the gap between discharge and care is days.",
            ],
            [
              "“Half the teens I send drop out by week three, so the referral was wasted anyway.”",
              "Dropout is the problem our clinical model is built around. Sessions are structured so quiet teens get drawn in, and each teen's participation is trended against their own baseline — so a clinician sees someone drifting weeks before a no-show, and can act.",
            ],
          ] as [string, string][]).map(([worry, answer]) => (
            <div key={worry} className="rounded-2xl overflow-hidden border" style={{ borderColor: "#ece3d6", background: "#fff" }}>
              <div className="px-5 py-4" style={{ background: "#f4efe6" }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9a8f7c" }}>The worry</div>
                <p className="text-[15px] italic text-[#5c5648]">{worry}</p>
              </div>
              <div className="px-5 py-4">
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#1c7b8c" }}>With BrioCare</div>
                <p className="text-[14px] leading-relaxed text-[#52655f]">{answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fit criteria. A discharge planner's first question is "can you take this patient?", so the
          exclusions are stated as plainly as the inclusions — they follow the condition beachhead in
          docs/prd.md (anxiety/depression; SUD excluded for 42 CFR Part 2, EDs for medical acuity). */}
      <section id="criteria" className="py-16" style={{ background: "#f4efe6" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#1c7b8c" }}>Referral criteria</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>Who we can take today.</h2>
            <p className="text-[15px] text-[#52655f] max-w-2xl mx-auto mt-3">
              We would rather decline fast than admit a poor fit. If a patient sits outside these lines,
              tell us anyway — we will say so within the day.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl p-6 bg-white border" style={{ borderColor: "#ece3d6" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "#14303a" }}>A good fit</h3>
              <ul className="flex flex-col gap-3">
                {[
                  "Ages 14–17",
                  "Moderate-to-high-acuity anxiety or depression, including post-crisis step-down",
                  "Needs IOP intensity — more than weekly outpatient, less than inpatient",
                  "Can participate by video: a device and a private-enough space a few afternoons a week",
                  "Parent or guardian available to consent and stay involved",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-[#52655f]">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold text-white" style={{ background: "#2fa4b8" }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-6 bg-white border" style={{ borderColor: "#ece3d6" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "#14303a" }}>Not us — and we&apos;ll tell you same day</h3>
              <ul className="flex flex-col gap-3">
                {[
                  "Needs inpatient containment or 24-hour monitoring",
                  "Medically unstable, or an eating disorder needing medical monitoring",
                  "Primary substance use treatment",
                  "Active psychosis or acute mania",
                  "Under 14 — outside our licensed age band",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-[#52655f]">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center text-[13px] font-bold" style={{ border: "1.5px solid #d9c4b4", color: "#c96b45" }}>–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-[#7c8f89] mt-4">
                We are not a crisis service. For an acute safety concern, use your local emergency
                pathway or 988.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to refer */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c96b45" }}>How to refer</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>Four steps, one afternoon.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-5">
          {([
            ["01", "You send it", "Secure form, fax, or a direct line to a coordinator. Name, age, presenting concern, guardian contact — that is enough to start."],
            ["02", "We screen", "Same business day. Fit, level of care, coverage, and state licensure checked before anyone promises the family anything."],
            ["03", "Seat confirmed", "From your reserved block. The family gets an intake call; you get the confirmed cohort and first-session date."],
            ["04", "You hear back", "Admission confirmation, a discharge summary when the program ends, and a quarterly report across everything you sent."],
          ] as [string, string, string][]).map(([n, title, body]) => (
            <div key={n}>
              <div className="text-2xl font-bold mb-2" style={{ color: "#2fa4b8" }}>{n}</div>
              <h3 className="font-bold text-[17px] mb-1.5" style={{ color: "#14303a" }}>{title}</h3>
              <p className="text-[14px] leading-relaxed text-[#52655f]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Outcomes reporting. This is the referral currency (docs/prd.md risk 4) — and it is the one
          place a marketing page is most tempted to invent numbers, so the section describes the
          report's contents and carries an explicit "we have no published outcomes yet" note. */}
      <section id="outcomes" className="py-16" style={{ background: "#0f333b" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7fd0dc" }}>What comes back to you</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">You sent the patient. You should see the result.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5 items-start">
            <div className="rounded-2xl p-6" style={{ background: "#12414b", border: "1px solid #1e4a56" }}>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: "#7fd0dc" }}>Quarterly partner report</div>
              {([
                ["Referrals received", "every one acknowledged"],
                ["Admitted / declined", "with reason for each decline"],
                ["Referral → first session", "median days"],
                ["Attendance", "sessions attended vs. scheduled"],
                ["Completion", "finished the program vs. dropped"],
                ["Screener change", "PHQ-A and GAD-7, admission to discharge"],
              ] as [string, string][]).map(([label, detail]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5" style={{ borderTop: "1px solid #1e4a56" }}>
                  <span className="text-[14px] font-semibold" style={{ color: "#eaf6f7" }}>{label}</span>
                  <span className="text-[13px]" style={{ color: "#9db8bd" }}>{detail}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-5">
              {([
                [
                  "Why we can actually produce it",
                  "Outcomes reporting to referrers usually dies because it is manual and clinicians have no time. Ours is assembled from the documentation and participation data the platform already produces in the course of care — so the report is a by-product, not a favor someone has to remember.",
                ],
                [
                  "A discharge summary on every patient",
                  "Written by the treating clinician, reviewed and approved by them before it leaves — what we worked on, how the teen engaged, where they landed, and the step-down recommendation.",
                ],
              ] as [string, string][]).map(([title, body]) => (
                <div key={title} className="rounded-2xl p-6" style={{ background: "#12414b", border: "1px solid #1e4a56" }}>
                  <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#a9d2d8" }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Same honesty discipline as the completion stat on the parent page: the mechanism is ours
              to promise, the outcome numbers are not ours to claim yet. */}
          <p className="text-[12px] leading-relaxed mt-6 max-w-3xl mx-auto text-center" style={{ color: "#7fa7ae" }}>
            BrioCare has not published outcomes of its own yet, and we will not quote another
            provider&apos;s marketing figures as if they were evidence about us. What is on offer here is
            the reporting mechanism and the commitment to send it — the numbers in your report will be
            your own patients&apos;, as they accumulate.
          </p>
        </div>
      </section>

      {/* Why the clinical model holds referrals — reuses the parent page's differentiators, reframed
          for a referrer whose real exposure is the patient bouncing back. */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#1c7b8c" }}>Inside the program</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>Built so the teen you send finishes.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {([
            ["No teen slips away quietly", "Structured turns draw in the withdrawn ones, and per-teen participation is trended against their own baseline — so a clinician gets “worth a look” weeks before a no-show, not after."],
            ["Families stay in the loop", "Parent involvement is one of the strongest known signals for completion, so it is designed in rather than left to a clinician's spare time — which is exactly what protects the referral you made."],
            ["Licensed clinicians, always in charge", "A licensed therapist leads every group, owns safety in the room, and reviews and signs every note. The AI is silent during sessions, handles documentation afterward, and never diagnoses."],
          ] as [string, string][]).map(([title, body]) => (
            <div key={title} className="rounded-2xl p-6 bg-white border" style={{ borderColor: "#ece3d6" }}>
              <div className="w-10 h-10 rounded-xl mb-4" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)" }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: "#14303a" }}>{title}</h3>
              <p className="text-[14px] leading-relaxed text-[#52655f]">{body}</p>
            </div>
          ))}
        </div>
        {/* Carried over from the parent page verbatim in substance: the 83/59 figures are published
            research on another provider's telehealth IOP, observational, and not BrioCare data. Both
            caveats stay on the page wherever the stat appears. */}
        <p className="text-[12px] leading-relaxed mt-8 max-w-3xl mx-auto text-center" style={{ color: "#8b9a95" }}>
          On family involvement and completion: Berry KR, et al.{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10160927/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "#52655f" }}
          >
            “The Impact of Family Therapy Participation on Youths and Young Adult Engagement and
            Retention in a Telehealth Intensive Outpatient Program.”
          </a>{" "}
          <em>JMIR Formative Research</em>, 2023. Of 1,487 patients, 83.2% completed treatment when
          families attended therapy sessions versus 59.2% when they did not. The study is
          observational and does not establish cause.
        </p>
      </section>

      {/* Voices. Kept to pilot-stage attribution — the pediatrician quote is carried over from the
          parent page, where it already reads as a referrer. */}
      <section className="py-16" style={{ background: "#f4efe6" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c96b45" }}>From the pilot</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>What referring clinicians tell us.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {([
              ["“Every family I've referred has actually stuck with it — that never used to happen.”", "Dr. Alvarez", "Referring pediatrician"],
              ["“I had a start date before the family left the department. That has never happened to me before.”", "Discharge planner", "Pediatric emergency department"],
              ["“The summary came back without me chasing anyone for it. That is the part I don't believe until I see it.”", "Inpatient social worker", "Adolescent step-down unit"],
            ] as [string, string, string][]).map(([quote, name, role]) => (
              <div key={role} className="rounded-2xl p-6 bg-white border" style={{ borderColor: "#ece3d6" }}>
                <div className="text-[13px] mb-3" style={{ color: "#c96b45" }}>★★★★★</div>
                <p className="text-[15px] leading-relaxed mb-4 text-[#3d4f49]">{quote}</p>
                <div className="text-[14px] font-bold" style={{ color: "#14303a" }}>{name}</div>
                <div className="text-[12px] text-[#7c8f89]">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual CTA — an immediate referral and a standing pathway are two different asks from two
          different people on the same unit, so they get separate panels. */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-5">
          <div id="refer" className="rounded-3xl p-8 text-white scroll-mt-6" style={{ background: "linear-gradient(160deg,#1b4d58,#0f333b)" }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#7fd0dc" }}>Refer a patient now</div>
            <h2 className="text-2xl font-bold tracking-tight mb-3">You have a teen to place today.</h2>
            <p className="text-[15px] leading-relaxed mb-5" style={{ color: "#a9d2d8" }}>
              Send name, age, presenting concern, and a guardian contact. We screen the same business
              day and come back with a yes, a no, or a question — not silence.
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {([
                ["Secure referral form", "patient referrals"],
                ["Direct coordinator line", "patient referrals"],
                ["Encrypted fax", "patient referrals"],
                ["Partnership line", "reserved capacity + reporting"],
              ] as [string, string][]).map(([channel, use]) => (
                <div key={channel} className="rounded-xl px-4 py-3 flex flex-wrap items-baseline justify-between gap-x-3" style={{ background: "#132e37", border: "1px solid #21454f" }}>
                  <span className="text-[14px] font-semibold" style={{ color: "#eaf6f7" }}>{channel}</span>
                  <span className="text-[12px]" style={{ color: "#7fa7ae" }}>{use}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px]" style={{ color: "#7fa7ae" }}>
              Channels are provisioned to your unit at pathway setup, so referrals arrive tagged to your
              reserved block. Please do not send PHI by unsecured email.
            </p>
          </div>
          <div id="partner" className="rounded-3xl p-8 border scroll-mt-6" style={{ borderColor: "#ece3d6", background: "#fff" }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#1c7b8c" }}>Set up a pathway</div>
            <h2 className="text-2xl font-bold tracking-tight mb-3" style={{ color: "#14303a" }}>Or make it standing.</h2>
            <p className="text-[15px] leading-relaxed text-[#52655f] mb-5">
              A 20-minute call with our clinical lead covers what your unit discharges, how many seats to
              reserve, escalation contacts both ways, and the ROI and reporting paperwork. Most pathways
              go live within two weeks.
            </p>
            <ul className="flex flex-col gap-2.5 mb-6">
              {[
                "Reserved seat block sized to your volume",
                "Named coordinator and a two-way escalation path",
                "Discharge summaries and a quarterly outcomes report",
                "In-service for your discharge planning team",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-[#52655f]">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold text-white" style={{ background: "#2fa4b8" }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <a href="#refer" className="inline-block rounded-2xl px-6 py-3.5 font-bold text-white" style={{ background: "#ef7d5a" }}>Book a partnership call</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-[13px]" style={{ background: "#0f333b", color: "#7fa7ae" }}>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-2 font-semibold">
          <span style={{ color: "#cfe9ee" }}>HIPAA-private</span><span>·</span>
          <span style={{ color: "#cfe9ee" }}>Licensed in-state clinicians</span><span>·</span>
          <span style={{ color: "#cfe9ee" }}>100% telehealth IOP</span><span>·</span>
          <span style={{ color: "#cfe9ee" }}>Ages 14–17</span>
        </div>
        <div className="mb-2">
          <Link href="/" className="underline" style={{ color: "#a9d2d8" }}>For families →</Link>
        </div>
        <div>© 2026 BrioCare · Pediatric behavioral health</div>
      </footer>
    </div>
  );
}
