import Link from "next/link";

// Public marketing landing page, built to match the marketing design mock.
export default function LandingPage() {
  return (
    <div style={{ background: "#faf6ef", color: "#243b34" }}>
      {/* Announcement */}
      <div className="text-center text-[13px] font-medium py-2 px-4" style={{ background: "#0f333b", color: "#cfe9ee" }}>
        Now enrolling kids in new therapy groups for Fall 2026 —{" "}
        <Link href="/patient" className="font-bold" style={{ color: "#f6a97f" }}>get started →</Link>
      </div>

      {/* Nav */}
      <header className="max-w-6xl mx-auto flex items-center gap-6 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-8 h-8 rounded-lg text-white font-bold" style={{ background: "#1c7b8c" }}>◎</span>
          <span className="font-bold text-xl tracking-tight" style={{ color: "#14303a" }}>BrioCare</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#52655f] ml-4">
          <a href="#results" className="hover:text-[#135463]">Results</a>
          <a href="#how" className="hover:text-[#135463]">How it works</a>
          <a href="#stories" className="hover:text-[#135463]">Stories</a>
          {/* The referral pipe is the demand engine (docs/prd.md risk 4), so referring clinicians
              who land on the family page need one hop to their own page. */}
          <Link href="/refer" className="hover:text-[#135463]">For providers</Link>
        </nav>
        <Link href="/patient" className="ml-auto rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#135463" }}>Get started</Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold mb-5" style={{ color: "#c96b45" }}>
            <span>★★★★★</span> Loved by families and our clinicians
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-5" style={{ color: "#14303a" }}>
            Every kid heard.<br />Truly supported.<br />A group that finishes.
          </h1>
          <p className="text-[17px] leading-relaxed text-[#52655f] max-w-xl mb-7">
            BrioCare is a pediatric behavioral health provider. Our licensed therapists lead every group,
            backed by an AI co-pilot that keeps your child drawn in and supported — so kids stay in, get
            heard, and finish the program.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/patient" className="rounded-2xl px-6 py-3.5 font-bold text-white" style={{ background: "#ef7d5a" }}>Get started</Link>
            <a href="#how" className="rounded-2xl px-6 py-3.5 font-bold" style={{ border: "1.5px solid #cdd8d6", color: "#135463" }}>See how it works</a>
          </div>
          <p className="text-[13px] text-[#7c8f89] mt-5 max-w-md">
            A real clinician leads every group. The AI is silent in session and never diagnoses.
          </p>
        </div>

        {/* Hero visual — mini live-room mock */}
        <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(160deg,#1b4d58,#0f333b)" }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#7fd0dc" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#ef7d5a" }} />Live · Tuesday group · Session 6
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { i: "MR", n: "Maya R.", tag: "speaking", tagBg: "#ef7d5a" },
              { i: "DP", n: "Devon P.", tag: "", tagBg: "" },
              { i: "AS", n: "Ari S.", tag: "camera off", tagBg: "#00000055" },
              { i: "JL", n: "Jordan L.", tag: "", tagBg: "" },
            ].map((t) => (
              <div key={t.i} className="relative rounded-xl flex items-end p-3" style={{ minHeight: 96, background: "#132e37", border: "1px solid #21454f" }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full grid place-items-center font-bold" style={{ background: "#cfeef2", color: "#0f333b" }}>{t.i[0]}</div>
                </div>
                {t.tag && <span className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: t.tagBg, color: "#fff" }}>{t.tag}</span>}
                <span className="relative text-[12px] font-semibold z-10" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{t.n}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl p-3" style={{ background: "#12303a" }}>
            <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "#6a8b93" }}>Participation this session</div>
            {([["Maya R.", 90, "#2fa4b8"], ["Devon P.", 60, "#5ac0cd"], ["Ari S.", 25, "#e8875a"]] as [string, number, string][]).map(([n, w, c]) => (
              <div key={n} className="mb-1.5">
                <div className="text-[12px] mb-0.5" style={{ color: "#dbe9eb" }}>{n}</div>
                <div className="h-1.5 rounded-full" style={{ background: "#1e4a56" }}>
                  <div style={{ width: `${w}%`, height: "100%", background: c, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results band */}
      <section id="results" className="py-14" style={{ background: "#0f333b" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7fd0dc" }}>The results that matter</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Seen sooner, engaged more, better off.</h2>
          </div>
          {/* Tiles are flex/justify-center because the grid stretches every tile to the tallest,
              and the attributed completion stat runs much longer than the rest — without it the
              short tiles sit top-heavy over a block of dead space. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {([
              ["Days", "to start — not months on a waitlist"],
              ["Every kid", "gets a turn — structured so the quiet ones aren't skipped"],
              ["83%", "completed treatment when families joined therapy, vs 59% — published research, not BrioCare data"],
              ["Weekly", "progress updates so you can help at home"],
            ] as [string, string][]).map(([big, sub]) => (
              <div key={big} className="rounded-2xl p-6 text-center flex flex-col justify-center" style={{ background: "#12414b", border: "1px solid #1e4a56" }}>
                <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: "#7fd0dc" }}>{big}</div>
                <div className="text-[13px] leading-snug" style={{ color: "#a9d2d8" }}>{sub}</div>
              </div>
            ))}
          </div>
          {/* Source note. The 83/59 figures are from published research on a different provider's
              telehealth IOP — they are NOT BrioCare outcomes, and the study is observational, so it
              shows association rather than cause. Both caveats stay visible on the page. */}
          <p className="text-[12px] leading-relaxed mt-6 max-w-3xl mx-auto text-center" style={{ color: "#7fa7ae" }}>
            Completion figures: Berry KR, et al.{" "}
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10160927/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "#a9d2d8" }}
            >
              “The Impact of Family Therapy Participation on Youths and Young Adult Engagement and
              Retention in a Telehealth Intensive Outpatient Program.”
            </a>{" "}
            <em>JMIR Formative Research</em>, 2023. Of 1,487 patients, 83.2% completed treatment when
            families attended therapy sessions versus 59.2% when they did not. The study is
            observational and does not establish cause. BrioCare has not yet published outcomes of
            its own.
          </p>
        </div>
      </section>

      {/* Worries */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c96b45" }}>If this sounds familiar</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>The worry ends here.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {([
            ["“We've been stuck on a waitlist for months while things get worse.”", "Telehealth groups mean far shorter waits. Most families start within days, not months — so help arrives when it matters."],
            ["“My child is too shy to speak up and just fades into the group.”", "Structured turns gently draw in quiet kids, and your therapist sees who has gone quiet across sessions instead of having to catch it live — so a fading child gets noticed early, not after they've stopped coming."],
            ["“We tried therapy before and nothing really stuck.”", "Finishing is what makes it stick, and family involvement is one of the strongest known signals for finishing: in a study of 1,487 teens in a telehealth program, 83% completed when families took part in therapy versus 59% when they didn't. Keeping families in the loop is built into how BrioCare runs."],
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

      {/* Why families */}
      <section className="py-16" style={{ background: "#f4efe6" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#1c7b8c" }}>Why families choose BrioCare</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>Care built around your child.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {([
              ["No kid slips away", "Structured turns draw in the quiet ones, and per-child participation trends flag who's drifting — weeks before they'd quit."],
              ["A therapist who's fully present", "The AI handles the busywork and charting, so your child's therapist spends the session on care — not paperwork."],
              ["Real clinicians, always in charge", "A licensed therapist leads every group and reviews everything. The AI is a co-pilot, never the pilot — it never diagnoses or replaces your clinician."],
            ] as [string, string][]).map(([title, body]) => (
              <div key={title} className="rounded-2xl p-6 bg-white border" style={{ borderColor: "#ece3d6" }}>
                <div className="w-10 h-10 rounded-xl mb-4" style={{ background: "linear-gradient(150deg,#7fd0dc,#2fa4b8)" }} />
                <h3 className="text-lg font-bold mb-2" style={{ color: "#14303a" }}>{title}</h3>
                <p className="text-[14px] leading-relaxed text-[#52655f]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c96b45" }}>How it works</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#14303a" }}>How your child&apos;s group works.</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-5">
          {([
            ["01", "We match", "We place your child in a small group with the right licensed therapist."],
            ["02", "They join", "Kids meet by video. The therapist leads; the AI keeps everyone engaged."],
            ["03", "Everyone's heard", "Every child gets a turn, and struggles are caught early."],
            ["04", "You're in the loop", "You get updates and simple ways to help at home."],
          ] as [string, string, string][]).map(([n, title, body]) => (
            <div key={n}>
              <div className="text-2xl font-bold mb-2" style={{ color: "#2fa4b8" }}>{n}</div>
              <h3 className="font-bold text-[17px] mb-1.5" style={{ color: "#14303a" }}>{title}</h3>
              <p className="text-[14px] leading-relaxed text-[#52655f]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stories */}
      <section id="stories" className="py-16" style={{ background: "#0f333b" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7fd0dc" }}>Stories from the pilot</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Families felt the difference first.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {([
              ["“My daughter kept her camera off and barely spoke for weeks. Now she volunteers first. I finally feel like someone truly sees her.”", "Renata M.", "Parent of a 15-year-old"],
              ["“For the first time I actually know how his week went — and exactly how to help at home.”", "Parent", "Social anxiety group"],
              ["“Every family I've referred has actually stuck with it — that never used to happen.”", "Dr. Alvarez", "Referring pediatrician"],
            ] as [string, string, string][]).map(([quote, name, role]) => (
              <div key={name} className="rounded-2xl p-6" style={{ background: "#12414b", border: "1px solid #1e4a56" }}>
                <div className="text-[13px] mb-3" style={{ color: "#f6a97f" }}>★★★★★</div>
                <p className="text-[15px] leading-relaxed mb-4" style={{ color: "#eaf6f7" }}>{quote}</p>
                <div className="text-[14px] font-bold text-white">{name}</div>
                <div className="text-[12px]" style={{ color: "#9db8bd" }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "#14303a" }}>Group therapy that actually finishes.</h2>
        <p className="text-[16px] text-[#52655f] max-w-xl mx-auto mb-7">
          Most kids quit before group therapy has time to work. BrioCare is built around keeping them
          in the room — structured turns so quiet kids are drawn in, a participation signal so your
          therapist spots someone slipping early, and families kept in the loop. A licensed therapist
          leads every session; the AI works behind the scenes.
        </p>
        <Link href="/patient" className="inline-block rounded-2xl px-8 py-4 font-bold text-white" style={{ background: "#ef7d5a" }}>Get started</Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-[13px]" style={{ background: "#0f333b", color: "#7fa7ae" }}>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mb-2 font-semibold">
          <span style={{ color: "#cfe9ee" }}>HIPAA-private</span><span>·</span>
          <span style={{ color: "#cfe9ee" }}>Licensed clinicians</span><span>·</span>
          <span style={{ color: "#cfe9ee" }}>100% telehealth</span><span>·</span>
          <span style={{ color: "#cfe9ee" }}>Parents kept in the loop</span>
        </div>
        <div className="mb-2">
          <Link href="/refer" className="underline" style={{ color: "#a9d2d8" }}>For referring providers →</Link>
        </div>
        <div>© 2026 BrioCare · Pediatric behavioral health</div>
      </footer>
    </div>
  );
}
