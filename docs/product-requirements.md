# BrioCare — Product Requirements

**Status:** Phase 1 is built and demonstrable end-to-end on synthetic data.
**Companion document:** `technical-design.md` covers the architecture and implementation.
**Scope of this document:** the market thesis, the segment and product decisions behind it, the
journeys we researched, and what the first version does and deliberately does not do.

---

## 1. Summary

Group therapy is the only format in behavioral health where one clinician can treat eight patients
at once, which makes it the only format whose economics work without a subsidy. It underperforms
anyway, and not because the clinicians are bad at it.

A therapist running a group of eight adolescents is delivering curriculum, managing group dynamics,
de-escalating conflict, scanning for risk cues, and trying to draw in the kids who have gone quiet —
all at the same time, usually over video. Afterwards they write an individualized progress note for
every teen in the room, plus a group note, usually after hours. Attention is the scarce resource in
the session, and time is the scarce resource after it. The teens who need the most of the first are
the least likely to ask for it, and the second is the single largest driver of clinician burnout and
the hard ceiling on how many patients one therapist can carry.

**BrioCare is a virtual intensive outpatient program (IOP) for adolescents, whose competitive wedge
is a proprietary AI co-facilitator: a clinician-supervised, voice-first system that works alongside
the therapist before, during, and after every group session.** We are the provider rather than a
tool vendor — we employ the clinicians, bill the payer, and deploy the AI inside our own program.
The AI assists and never delivers care on its own.

The co-facilitator's job is to run the mechanics of a structured group so that every teenager
actually participates, and so the therapist's attention goes to clinical work instead of
administration. That is a continuous loop rather than a single feature, and it eventually spans all
three people in the system — the therapist, the teenager, and the parent:

- **Before the session,** it tells the therapist who to watch and who to draw in today.
- **During the session,** it listens to every participant on their own audio track and measures
  participation as it happens — who is speaking, who has gone quiet, who is present but withdrawn.
- **After the session,** it drafts the individualized documentation from what each teenager actually
  said, and scans for safety signals.
- **Between sessions,** it trends each teenager's participation against their own history so someone
  sliding toward dropout becomes visible while there is still time to act.

The first version delivers that full loop for the therapist. What it deliberately does not yet do is
speak: during the session the AI listens and measures but produces no output, because we are not
prepared to stand behind a real-time clinical claim and will not build an interface that implies
one. In-session voice facilitation and the parent-facing layer are the next two things we build, and
both run on data the first version already produces. That sequencing is the plan, not a limitation
we are working around.

All of it serves one north star. The biggest failure in adolescent group therapy is the teen who
drops out in the first few weeks because they never felt they belonged or never got drawn in. No
completion means no clinical benefit, and it also means no outcomes data, which is the currency that
keeps referral sources sending patients. Documentation relief buys back the clinician's attention.
The engagement signal tells them where to spend it.

---

## 2. Problem

Pediatric group therapy should be a scalable and effective part of behavioral health. In practice it
underperforms, for three connected reasons.

**The clinician's attention is divided past the point of usefulness.** Running a group means
teaching a skills module, managing the dynamics between eight teenagers, de-escalating when needed,
and watching every face for signs of risk. On a video grid this is harder, not easier. There is no
objective record of who participated and who withdrew, so subtle disengagement is noticed late or
not at all.

**Quiet teens get the least, and need the most.** A socially anxious adolescent in a group of
strangers will not compete for airtime. The format rewards the teens who are already comfortable
speaking. Without deliberate intervention, the participants who would benefit most from a group
setting are the ones it serves worst — and they are also the ones most likely to quietly decide the
program is not for them.

**Documentation caps the business.** Payers require an individualized progress note for every
participant in every session. Written from memory after hours, for eight teens at a time, this is
the leading driver of clinician burnout and a genuine compliance exposure — rushed or templated
notes that read alike across patients are exactly what a payer audit looks for. Critically, it is
administrative load rather than clinical capacity that determines how many patients one therapist
can carry. That is a business constraint disguised as a paperwork problem.

---

## 3. Solution

BrioCare is a telehealth behavioral health provider — clinician-supervised, group-first, built
around a proprietary AI co-facilitator that runs the mechanics of a structured group session so the
therapist can focus on the clinical work.

Three commitments define the shape of the product.

**We are the provider, not the software.** We employ or contract the clinicians, we bill the payer,
and we deploy the AI inside our own program. This captures the reimbursement rather than a software
licence fee, and it means we control how the AI is used rather than hoping a customer uses it well.

**The clinician is always in control.** The AI drafts, surfaces, and flags. It does not decide, and
it does not treat. This is a clinical safety position first, and it is also what keeps the product
out of FDA medical-device territory, which matters enormously for a product serving minors in mental
health.

**Virtual by default.** Every participant joins from their own device, which means every participant
is a separate clean audio stream. That single fact is what makes the whole technical approach
viable — see Section 7, risk 2.

### What the co-facilitator does

The product is a loop around the session rather than a set of separate tools, and it serves all
three people in the system.

| | Therapist | Teenager | Parent |
|---|---|---|---|
| **Before** | Who to watch and who to draw in today | A low-friction way in, and a private check-in before walking into the room | What is coming this week and how to help with it |
| **During** | Listening on every participant's own track; live participation measurement; prompts that balance turn-taking | Camera and microphone off until ready, and explicit permission to pass; an invitation to speak when they have gone quiet | — |
| **After** | Individualized documentation grounded in evidence, and a safety scan | The one skill to practise this week | A session summary and a concrete way to reinforce it at home |
| **Between** | A caseload view of who is trending toward dropout | Low-pressure practice and encouragement | A nudge when their teen is slipping |

Three things about this shape are the actual thesis.

**Each stage produces what the next one needs.** Listening during the session is what makes the
documentation grounded in what a specific teenager actually said. The documentation and the
participation trend are what give the parent layer something true to say. The trend is what tells
in-session facilitation who to invite into the conversation. The product compounds on its own data
rather than requiring a new data source for every feature, which is why the order we build in
matters and why each layer gets more valuable as the one beneath it proves out.

**It serves all three people because completion depends on all three.** A teenager finishes the
program when the therapist has enough attention to draw them in, when the group feels safe enough to
come back to, and when a parent keeps them showing up. A product that serves only the clinician
improves one of those three and leaves the other two to chance — which is roughly the current state
of the category.

**The loop only closes if you own the session.** Every stage depends on holding the room: separate
audio per participant, behavioral telemetry, the ability to shape what a teenager sees when they
join. A vendor selling software into someone else's video call gets none of that reliably. This is
the concrete reason we are the provider rather than the tool, and it is why the reimbursement
argument and the product argument point the same way.

---

## 4. Who this is for

### Primary users

**Therapists.** The primary user of the co-facilitator, and the user whose day the product changes
most. Everything in the first version is built for them.

**Adolescent patients.** The people receiving care. They are not the buyer and usually not the
decision-maker, but they are the ones who drop out, so the product has to earn their willingness to
keep showing up. What they see is deliberately warm and non-clinical — they are never shown a
participation score or an engagement status.

**Parents and guardians.** They control attendance, consent, and whether the teen keeps coming. This
makes them a retention engine rather than a peripheral audience.

Family involvement is strongly associated with program completion, and the best evidence is directly
on-point for us: in a retrospective analysis of 1,487 patients in a **telehealth intensive outpatient
program** — our exact modality and care level — 83.2% completed treatment when families attended
therapy sessions, against 59.2% when they did not, with each additional family session associated
with roughly 1.4× the odds of completing.<sup>1</sup>

Two limits on how far that carries, both worth stating before anyone repeats the number:

- **It measured family therapy sessions, not parent communication.** The intervention studied was
  families attending therapy. It is adjacent to, but not the same as, the parent-updates layer on our
  roadmap — see Section 16.
- **It is observational, not causal.** The study is a retrospective quality-improvement analysis, and
  the authors note it "does not account for existing differences in families that opt to
  participate." Families who opt in likely differ systematically. It shows association only.

<sup>1</sup> Berry KR, Gliske K, Schmidt C, Ballard J, Killian M, Fenkel C. "The Impact of Family
Therapy Participation on Youths and Young Adult Engagement and Retention in a Telehealth Intensive
Outpatient Program: Quality Improvement Analysis." *JMIR Formative Research*, 2023;7:e45305.
PMID 37079372.

### Secondary stakeholders

**Referral sources** — emergency-department discharge planners, inpatient social workers, school
counselors, and pediatricians. They generate demand and, over time, become the defensible part of
the business. See Section 7, risk 4.

**Payers and insurers.** They steer patients, pay the bills, and care about both outcomes and cost.
They are a business-to-business stakeholder whose requirements shape the documentation product
directly, because their audit standards define what a compliant note looks like.

**Platform and infrastructure vendors** — the video, speech recognition, and cloud providers that
sit inside the clinical data path. They matter to product decisions because each one must sign a
Business Associate Agreement before touching real patient data, and any that will not is
disqualified regardless of technical merit.

**Regulators and licensing bodies** — state licensure boards, HIPAA enforcement, and state-specific
consent and telehealth rules. They constrain which states we can operate in and how fast we can
expand, which makes state sequencing a product decision rather than a purely operational one.

---

## 5. Segment selection: why adolescents, and why 14–17

The pediatric mental health market divides into two meaningful segments: school-age children roughly
6 to 12, and adolescents roughly 13 to 17.

The initial brief pointed toward the 6–12 group. Based on my research I favor adolescents instead,
and within that group our beachhead is the **14–17** sub-band. Five reasons, in the order I weight
them.

**1. The group format fits teenagers developmentally.** Working out where you fit among peers and
who you are relative to them is the central developmental task of adolescence. A therapy group works
with that instinct. For younger children, groups have to be built around structured activities and
depend on the clinician to direct every moment, which means the format gives back far less leverage.

**2. The need is roughly twice as large.** Social anxiety affects approximately 4.7% of children and
approximately 8.3% of adolescents.

**3. The referral pipeline is already teen-centric.** Emergency departments and inpatient units
discharge substantially more adolescents than younger children, and those discharges are warm,
high-intent referrals — a teenager leaving an inpatient stay needs a next level of care immediately,
and someone is actively looking for one. That is the cheapest, highest-conversion source of patients
in this market, and it points at teens.

**4. The economics are structurally better.** Standard group psychotherapy billing, CPT code 90853,
reimburses roughly $30 per patient per session, which caps revenue no matter how well the group
runs. Intensive outpatient programs bill a per-diem rate instead — on the order of 10 to 25 times a
single 90853 unit for the same clinical hour — and IOP is built around the higher-acuity cases that
appear far more often in adolescents. The care level and the age band are economically linked.

**5. Voice AI is far more tractable on teenagers.** Teens can join a session, follow a voice-guided
structure, and self-manage the technology with little adult help. Younger children need more
scaffolding, have shorter attention spans, and require heavier parental presence, all of which makes
the product harder to build and raises the safety stakes.

---

## 6. Critical product decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Tool or provider | **Provider** | Captures the reimbursement rather than a software fee, and lets us control how the AI is actually deployed instead of hoping a customer deploys it well. |
| Role of the AI | **Co-pilot and co-facilitator, clinician always in control** | The AI assists; it never delivers therapy. This keeps us out of FDA medical-device classification, which is close to non-negotiable for a minors plus mental-health product. |
| Age band | **Adolescents 14–17, not 6–12** | The group modality is developmentally suited to teens, the referral pipeline and IOP economics are both teen-centric, voice AI is far more tractable, and teens can self-engage. Choosing 14 as the floor also puts us above the COPPA threshold. |
| Condition beachhead | **Moderate-to-high-acuity anxiety and depression** | The largest and most group-amenable population. It also avoids the additional regulatory burden of substance use disorder treatment (42 CFR Part 2) and the medical-acuity risk of eating disorders. |
| Care level | **Intensive outpatient program (IOP)** | Per-diem billing is the actual economic engine, and IOP is fed directly by the warm crisis and step-down referral pipeline. |
| Delivery | **Virtual** | Gives every participant a separate clean audio stream, which is what makes per-participant transcription and participation measurement possible at all. |

---

## 7. Critical risks and how we address them

These are the things most likely to kill the business. Each one is paired with the decision we made
in response.

**1. Regulation.** Serving minors with an AI product that records voice stacks several regimes on
top of each other: HIPAA, state-by-state consent and telehealth rules, two-party recording consent,
and clinician licensure in every state we operate. The worst realistic case is a teenager signalling
self-harm and an AI system mishandling it.

*Response.* Our 14–17 band sits above the COPPA threshold, which applies to children under 13.
Licensure and corporate-practice-of-medicine constraints are handled with a professional
corporation and management services organization structure, with clinicians licensed in each state.
On safety, the AI flags a possible self-harm signal to a live clinician and never manages a crisis
itself. In the first version it does not even do that in real time — the scan runs after the session
ends, and the live clinician owns in-room safety. We are not prepared to stand behind a real-time
crisis-detection claim, so we do not build an interface that implies one.

**2. Recognizing adolescent speech.** Real-time co-facilitation would require speech recognition in
close to the hardest possible conditions: several teenagers talking over each other in an
acoustically poor room, in voices that adult-trained models handle relatively badly.

*Response.* Going virtual dissolves most of this problem. Each teen joins on their own device, so
we capture one clean near-field stream per person rather than one noisy shared room. Speaker
identity becomes a property of which connection the audio arrived on, rather than something a model
has to infer. The remaining accuracy gap on adolescent voices is real, and we handle it by keeping a
human in the loop: low-confidence passages are marked as such rather than smoothed over, and the
clinician reviews before anything is signed. Recorded audio would eventually support a
teen-voice dataset for real-time work in a later version, but that requires separate,
purpose-specific consent and is explicitly out of scope now.

**3. Weak reimbursement.** Standard group therapy billing pays roughly $30 per patient per session,
which caps revenue and makes the model look unfundable regardless of how well it works.

*Response.* We do not build the business on CPT 90853. We target IOP per-diem reimbursement, which
pays roughly 10 to 25 times that for the same clinical time. This is the single decision that makes
the unit economics viable.

**4. Demand generation.** Everything the AI does — making clinicians productive, filling groups,
writing notes — is supply-side. None of it brings parents and teenagers through the door.

*Response.* Demand in this category is not a direct-to-consumer advertising problem; it is a
business-to-business-to-consumer referral machine, and the category leader has already proven the
playbook. Charlie Health fills a virtual teen IOP not through consumer ad spend but through a large
field team working emergency departments, inpatient step-down, health systems, schools, and primary
care — with rapid referral-to-admission pathways as the core promise. We build the same machine: the
clinical co-founder's network seeds it and a field team scales it.

The AI is genuinely part of this rather than just back-office plumbing. Referral partners buy on
outcomes reporting and discharge summaries, and those artifacts are exactly what our documentation
and participation data can produce automatically. Charlie Health markets on its own published
figures — 93% depression improvement and 95% avoided readmission at six months — which illustrates
the currency, though those are the company's own numbers and should be treated as marketing claims
rather than independent evidence. Our pitch to a partner is reserved capacity, same-week admission,
and outcomes reported back to them.

**5. Capital intensity.** Building a provider business requires real funding rather than a
bootstrap. Brightline raised $212 million and still went through layoffs and a significant
retrenchment.

*Response.* Make the category's poor track record the pitch rather than avoiding it: the first
behavioral health provider that is profitable at the group level, because applying AI to groups
fixes the one-to-one economics that killed the previous generation.

**6. Filling and running the groups.** Adolescents no-show frequently, and matching them across age,
condition, acuity, consent status, and schedule is genuinely difficult. Empty seats destroy group
margin, and group margin is the entire economic edge.

*Response.* This is squarely what the AI should be for, and it is the highest-value item on the
roadmap after parent engagement. Treat it like airline seat management: predict no-shows, overbook
deliberately, backfill from a waitlist, and assemble cohorts automatically. Fill rate becomes a
lever the system controls rather than an outcome we absorb. It is not in the first version because
proving the clinical wedge comes first.

**7. Payer contracting.** Getting in-network typically takes 12 to 18 months and the process repeats
in every state. Growth is operational rather than viral, and there is no way to shortcut the
credentialing calendar.

*Response.* Start deliberately narrow — one payer in one state, most likely Medicaid in the clinical
co-founder's home state. Cover early revenue with single-case agreements and out-of-network billing
while credentialing runs in the background. Then turn each state into a repeatable playbook rather
than a bespoke project.

**8. Parent disengagement.** Teenagers do not drive their own care. Parents book, consent, and keep
them showing up. Weak parent involvement quietly sinks both completion and outcomes, and it does so
without any obvious warning signal.

*Response.* The parent-engagement surface is the number one roadmap item precisely because it
protects completion, and completion is what feeds the referral loop — finished patients with good
outcomes are what referral sources trust and reward with more cases. The notes and participation
data that the first version produces are the raw material that layer runs on, which is why it comes
first.

**9. The category graveyard.** Pediatric behavioral health companies generally die from distribution
and revenue fragility rather than poor clinical care. Brightline sold through the employer channel
and contracted sharply. Hazel Health depended on COVID-era school district funding that dried up.
Cerebral built on controlled-substance prescribing and hit a regulatory scandal.

*Response.* Each of those failures maps to a decision we made in the opposite direction. Brightline
sold to employers, so we go through clinical referrals. Hazel's funding source was not durable, so
we build on recurring insurance per-diem reimbursement. Cerebral leaned on prescriptions, so we are
therapy-first with no controlled substances. These were committed to up front rather than
rationalized afterwards.

---

## 8. How care works today

The research the product is built on: what each of the three people in this system experiences,
stage by stage, and where it hurts. The pattern at the end is what the first version targets.

### The teenager

- **Struggle, then crisis.** Symptoms build for months; it often takes an emergency department
  visit, panic attack, school refusal, or self-harm before anyone acts. Shame, fear, and not knowing
  how to ask for help — and an ED that is not built for pediatric mental health.
- **Referral, then waitlist.** An adult refers; the teen waits weeks. No agency: adults decide
  everything about them, largely without them, while they continue to deteriorate.
- **Intake and assessment.** Paperwork, a long biopsychosocial interview, and screeners (PHQ-9/A,
  GAD-7, C-SSRS), often repeated for a coordinator, a clinician, and a psychiatrist — usually with a
  parent in the room. Retelling the worst moments repeatedly is retraumatizing, and with a parent
  present the teen cannot be honest about self-harm, substance use, suicidality, or home.
  **The emotional harm and the data failure are the same failure:** intake collects inaccurate data
  *and* teaches the teen that honesty is not safe, producing the wrong risk level, cohort match, and
  treatment plan before the first session.
- **First session.** Dropped into a virtual group of strangers — for a socially anxious adolescent,
  precisely the feared situation. Dread about the camera, fear of judgment, and immediate alienation
  if the match on age or acuity is poor.
- **Early weeks — the highest-dropout window.** Guarded and withdrawn, testing whether the group is
  safe. It is very easy to be invisible and have nobody draw you in; add skepticism, stigma about
  missing class, and often no private space to attend from. **This is where teenagers silently
  decide to quit** — the single most important window in the journey.
- **Mid-program.** Fit is left to chance. Bond with the cohort and it works; otherwise they check
  out. A dominant peer or unresolved conflict alienates quickly, home practice is hard, and the
  worry about who might find out never goes away.
- **Discharge.** Losing the community they finally built, fear of relapse, an abrupt "graduation",
  and a return to the same school and family environment that contributed to the problem.

### The parent

- **Noticing, then crisis.** Slow realization or a sudden discovery — self-harm, a suicidal comment,
  an ED trip, a call from school. Fear, guilt, stigma, and no idea where to turn.
- **Finding care.** Cold-calling providers, waitlists, and the insurance maze — often with nothing
  but a list of phone numbers from the ED. No map, no sense of what level of care their child needs,
  and bouncing between providers while the teen deteriorates.
- **Intake and enrollment.** Forms, consent, and authorization battles in crisis mode, real
  financial fear, and the logistics of work, siblings, and getting the teen to agree to go at all.
- **Program start and early weeks.** Confidentiality shuts them out, so they do not know what
  happens in session or whether it is working — while the whole logistical burden lands on them with
  no guidance on how to help.
- **Mid-program and between-session crises.** Sporadic updates, no way to reinforce the work at
  home, and the eleven-o'clock moment: a bad night, nobody to call, and no way to tell an emergency
  from a normal hard evening. They carry that risk alone.
- **Discharge.** Fear at losing the safety net, no clarity on what comes next, and back to managing
  alone.

### The therapist

- **Referral intake and cohort assembly.** A manual scheduling puzzle in spreadsheets. Teens are
  placed by seat availability rather than clinical fit, so groups mix ages and acuity and cohesion
  suffers; admission is slow and some teens never start.
- **Pre-session preparation.** Reviewing notes, plans, and incidents for eight to ten teenagers in
  the gap between back-to-back sessions. Records are scattered across the EHR and there is no time,
  so the therapist walks in cold and runs the group from memory.
- **Running the live group.** 60–90 minutes of curriculum, dynamics, de-escalation, drawing in the
  quiet, and scanning every face for risk — on a video grid. Attention is divided past the point of
  effectiveness, there is no objective record of who participated, and subtle disengagement and risk
  cues slip past.
- **Post-session documentation.** An individualized progress note per teen plus a group note, for
  billing and compliance, usually after hours. **The number one driver of burnout** — and the hard
  ceiling on caseload, since administrative load rather than clinical capacity decides how many
  teenagers one therapist can carry. Rushed or late notes also create audit exposure.
- **Between-session monitoring.** No caseload-level view, so dropout is noticed only when a teen
  stops showing up — too late to act. Parent outreach falls off the bottom of the list and team
  coordination is fragmented across phone, email, and the EHR.
- **Family engagement.** The factor that most drives completion gets the least attention: parents
  get sporadic contact and calls are handled reactively. Parents who feel shut out pull their child
  out.
- **Discharge and outcomes reporting.** Manual, and there is no time — so the discharge summary and
  outcomes report back to the referrer frequently just does not happen, quietly starving the
  referral relationship that produced the patient.

### The pattern

The therapist is drowning in administrative and cognitive load, with documentation the largest
component. They are flying blind on participation and dropout risk because no objective record
exists. And they have no time left for the parent relationship that most drives completion. That
same time-starvation also breaks the outcomes reporting loop that feeds referrals — so the
documentation burden is not only a clinician-experience problem, it is a growth problem.

---

## 9. The one thing that matters most

Across all three journeys, the single biggest failure is **the teenager who drops out in the early
weeks because they never felt they belonged or never got enough opportunity to participate.**

Without completion there is no clinical benefit. The north star is health outcomes, and dropout is
the most direct threat to it. Dropout also breaks the business loop: unfinished patients produce no
outcomes data, and outcomes data is what referral sources use to decide where to send the next
patient.

So why does participation drop? Because the therapist has no real visibility into it. They are fully
occupied during the session, drained by the work before and after it, and have neither the
information nor the assistance needed to identify who needs to be drawn in.

---

## 10. What the first version does

The first version puts the co-facilitator to work around the therapist's entire session cycle. It
does four jobs, and they are one continuous loop rather than four features:

1. **Prepare.** Before the group, tell the therapist who to watch and who to draw in.
2. **Listen and measure.** During the group, capture each teenager on their own audio track and
   compute participation as it happens.
3. **Document and scan.** After the group, draft each individualized note from that teenager's own
   words, with the evidence attached, and scan the session for safety signals.
4. **Trend.** Between groups, track each teenager's participation against their own history so
   someone drifting toward dropout surfaces early.

Jobs 1 and 4 point at retention — they change who gets the therapist's attention. Jobs 2 and 3
create the capacity to give it, by removing the documentation load that currently caps how many
patients one clinician can carry. Neither half works without the other: visibility with no spare
time changes nothing, and spare time with no visibility gets spent on whoever happens to be loudest.

Set against the full product in Section 3, the first version fills the therapist column end to end
and part of the teenager column — the way in, the private check-in, and the between-session practice
prompt. It does not yet fill the parent column, and it does not yet speak inside the room. Those are
the next two builds, in that order, and both run on data this version already produces.

We start with the therapist column for a specific reason rather than convenience: the therapist is
the only user whose adoption is required for anything else to function, and the participation signal
has to be demonstrably accurate before it is safe to act on it — either by prompting a teenager in
the room or by telling a parent their child is struggling. Proving the loop for the person who runs
the room is what earns the right to build the rest of it.

Mapping the first version against the therapist's journey:

| Stage | Status | What we do |
|---|---|---|
| Referral and cohort assembly | **Out of scope** | A coordinator hand-builds the single pilot cohort and enters it into the portal. |
| Pre-session preparation | **In scope** | A per-teen snapshot showing last session's participation and a summary of our own prior note. |
| Live session | **In scope, capture only** | Background capture of per-participant audio and behavioral telemetry. The AI is silent. |
| Post-session documentation | **In scope** | Draft individual notes plus a group note, with evidence; clinician reviews and signs. |
| Between-session monitoring | **In scope** | Participation trended per teen, presented as a caseload attention view. |
| Family engagement | **Out of scope** | The therapist contacts parents manually during the pilot. |
| Discharge and outcomes | **Out of scope** | Approved notes and participation data can compile a basic end-of-pilot summary. |

### Pre-session preparation

The therapist opens a per-teen snapshot showing last session's participation alongside a summary of
the system's own prior note. There is no dependency on an external health record — we read our own
data.

The purpose is tactical preparation for the group about to start: *who should I watch or draw in
today?* This points **into** the room.

### During the session: listening, not speaking

This is the stage most easily misread as the AI doing nothing, so it is worth being precise about
what happens.

The co-facilitator is working throughout the session. It holds a separate audio track for every
participant, transcribes each of them independently, and computes participation in real time:
speaking time, number of times each teenager entered the conversation, camera state, presence, and
chat activity. By the time the session ends, the transcript and the participation picture for every
teenager in the room already exist. None of that is reconstructed afterwards from a recording — it
is the product doing its core work live.

**What it does not do is speak.** There are no prompts to the clinician, no prompts to the
teenagers, and no real-time risk detection. The clinician runs the room exactly as they do today.

That is a deliberate sequencing decision rather than an unfinished feature. Interrupting a group of
adolescents is a clinical act, and getting it wrong — drawing out a teenager who is not ready,
interrupting a disclosure, misreading silence as disengagement — does real harm. We earn the right
to speak in the room by first proving the measurement is accurate, which is exactly what the first
version tests. The same applies to safety: we are not claiming real-time crisis detection, so we do
not build an interface that implies it, and the live clinician owns in-room safety. Foreground
facilitation is roadmap item 4 and expanded in-session risk assessment is item 5, in that order and
for that reason.

### Post-session documentation

After the session, each participant's audio is transcribed separately and turned into a draft
individualized progress note built from that teen's own transcript and telemetry, plus a group note
for the session.

**Every clinical claim in a draft carries the evidence it came from** — either a specific span of
that teen's transcript or the behavioral participation data. The review console shows this evidence
inline, so the clinician can check any statement against its source rather than taking the draft on
trust. This is the core requirement of the whole product, and it exists because a plausible
fabrication in a medical record is worse than no draft at all.

Notes reference treatment goals that are lightly seeded when the cohort is set up. **There is no
integration with any electronic health record and no treatment-planning module in the first
version.** The clinician reviews, edits, approves, and then copies the note into whatever system
their practice already uses.

The same batch pass runs a **self-harm scan tuned for high recall**. Flags surface to the clinician
with transcript evidence attached, each one requires an explicit disposition, and an unresolved
acute flag blocks note approval.

### Between-session engagement signal

Each teenager's participation is trended across all their sessions and presented as a caseload
attention view, grouped into three buckets: *falling versus baseline*, *worth a look*, and *stable
or improving*.

The purpose is strategic retention: *who is trending toward dropping out?* This drives action
between sessions — a check-in now, and a parent nudge once that layer exists. This points **between**
rooms, and it is the counterpart to the pre-session snapshot.

Two properties of this signal matter more than its accuracy:

**It is behavioral only.** Talk time, number of speaking turns, camera state, attendance, and chat
activity. It is computed from meeting telemetry and never from the content of what anyone said.

**It compares a teenager only to themselves.** Every signal is trended against that individual's own
established baseline, never against other members of the cohort. A naturally quiet teenager running
a consistently low level of participation is fine and is not flagged. The same teenager dropping
well below their own established pattern is the actual signal.

These are proxies rather than truth, and the product says so. The system surfaces "worth a look" and
the clinician interprets it. **It never labels a teenager as disengaged or at risk**, and the
teenagers themselves never see any of it.

---

## 11. Explicit non-goals for the first version

Stating these plainly, because several are things a reasonable person would assume are included.

- **No real-time output.** The system listens and measures live, but it does not speak: no live
  prompts to anyone, no live risk detection, no in-session facilitation.
- **No electronic health record integration.** Approved notes are copied across manually.
- **No treatment-planning module.** Goals are lightly seeded at cohort setup and nothing more.
- **No automated cohort assembly or scheduling.** The pilot cohort is built by hand.
- **No parent-facing product.** Parent contact during the pilot is manual and handled by the
  therapist.
- **No autonomous action of any kind.** The system drafts and surfaces. A clinician decides.
- **No model training on session recordings.** Audio is used for treatment and transcription only.
  Building a teen-voice dataset requires separate, purpose-specific consent and is a later-version
  question.

---

## 12. What the AI has to do

Five capabilities, in dependency order.

**Speech recognition.** Capture each participant's audio separately and transcribe it, using a
current best-in-class speech-to-text model. Because each teenager is on their own track, speaker
attribution is a property of the connection rather than something the model has to infer. Passages
the model is unsure about are marked as low-confidence rather than presented as certain.

**Participation metrics.** Derive behavioral telemetry from the session: how long each teenager
spoke, how many times they entered the conversation, how long their camera was on, how much of the
session they were present for, and chat activity. These come from meeting events rather than from
the transcript.

**Individual notes.** Use the teenager's own transcript plus their telemetry to draft a note for
clinician review. Four sections plus goal-progress signals. Every section shows the evidence it was
drawn from — transcript spans or telemetry — so the therapist can verify rather than trust.

**Group notes.** Generate a session-level group note from the same inputs, with four sections and
two cohort-level goal indicators.

**Risk scanner.** Scan for self-harm signals, tuned for high recall rather than precision. It runs
in batch at the end of the session rather than in real time. Flags go to the clinician with
transcript evidence, require a disposition, and an unresolved acute flag blocks note approval.

A note on the risk scanner's current state: the detection component ships as a deliberately obvious
placeholder rather than a real clinical detector, because a genuine risk taxonomy — the categories,
severity thresholds, escalation timelines, and mandated-reporter routing — is a clinical and legal
artifact requiring qualified sign-off. The full workflow around it is built and working. Only the
detector itself is waiting on that sign-off. `technical-design.md` Section 13 covers this in detail.

---

## 13. How we will know it worked

These are pilot bars for roughly one cohort. They are directional targets meant to prove or
disprove the wedge, not statistically powered claims.

### Documentation

- Median clinician review-to-approve time of **5 minutes or less per individual note**, and 5 minutes
  or less for the group note.
- Total post-session charting time down **60% or more** against the write-from-scratch baseline.
- **70% or more** of drafts approved with only light editing, measured by edit distance.
- **No ungrounded clinical claim reaches an approved note.** See the open question in Section 14
  about how strictly this is enforced by the system rather than by the clinician.
- **90% or more** of notes meet IOP medical-necessity documentation criteria on review by a
  clinician or biller.

### Engagement signal

- **60–70% or more** of teenagers surfaced as "worth a look" are ones the clinician agrees warranted
  attention, with a bounded number of surfaced teens per cohort per week as an alarm-fatigue guard.
- The signal flags a declining teenager **one to two sessions earlier** than an unaided clinician
  would notice, and before a no-show.

### Safety

- Self-harm scan **recall of 95% or better** on a seeded evaluation set built with clinical input.
- Every flag carries transcript-span evidence.
- 100% of acute flags carry a mandatory disposition before note approval.
- Acute flags acknowledged within the defined service-level window from session end.

### Adoption and pilot outcome

These are directional signals from a single cohort rather than measurements.

- Pilot cohort completion rate compared against the historical baseline.
- Therapist intent to continue, and whether they say the product made them faster.
- **Capture reliability: per-participant track captured and transcribed for 95% or more of attended
  sessions.** This one is close to a gating requirement — if capture is unreliable, nothing
  downstream is trustworthy.

---

## 14. Open questions and dependencies

Things that are genuinely undecided, separated by who has to decide them.

**Needs a clinical decision.** The risk taxonomy — categories, severity thresholds, escalation
protocol, and mandated-reporter routing. Validation that our note structure satisfies payer and
state IOP documentation and medical-necessity requirements; this is the dependency most likely to
change the product. And how strictly the grounding gate should block approval: the current build
treats unverified claims as advisory and requires the clinician to attest them rather than blocking
the signature outright, on the reasoning that a hard block turns the review console into an argument
with the verifier. That trade-off deserves a clinician's judgment rather than an engineer's.

**Needs a legal decision.** Data retention windows for audio, transcripts, and notes. The breach
notification process for minors' data. The specifics of the consent flow, including the genuinely
hard case where one guardian in a group declines recording and that blocks capture for the entire
session.

**Needs commercial work.** Business Associate Agreements with the cloud, video, and speech vendors,
none of which can touch real patient data until signed. Confirmation that our chosen models are
approved for protected health information on our cloud platform. Selection of the first payer and
state.

**Needs verification.** The competitor outcome figures in Section 7 are the company's own published
marketing claims and should be labelled as such wherever they are repeated. *(The family-involvement
completion statistic previously listed here has been sourced — see Section 4.)*

---

## 15. Current build status

Phase 1 is complete and runs end-to-end: the live session room, per-participant capture,
transcription, grounded note generation with per-claim evidence, the engagement signal and caseload
view, the risk-flag workflow, and the review-and-approve console with its audit trail.

It runs entirely on synthetic data. **No real patient information has ever been in the system.**
Authentication, consent enforcement, the real risk taxonomy, and the full compliance posture are
gated on the dependencies listed above, and each is deliberately and visibly stubbed rather than
partially implemented. `technical-design.md` Section 13 is an explicit inventory of what is not
real, which is worth reading alongside this document.

---

## 16. Roadmap

In priority order after the first version.

1. **Parent and family engagement.** Directly protects completion, which is the north star, and
   completion is what feeds the referral loop. The notes and participation data the first version
   produces are exactly the raw material this layer needs, which is why it comes first.

   **One honest gap in this rationale.** The evidence in Section 4 measured *families attending
   therapy sessions*, whereas what this item currently ships is parent summaries and nudges —
   communication, not participation in care. The completion effect is therefore adjacent evidence,
   not direct support. Two ways to close it, and the choice belongs with the clinical co-founder:
   widen this item to include a family-session component so it matches what the evidence actually
   tested, or keep it communication-only and stop leaning on the 83/59 figure to justify it.
2. **Breakout sessions** for short one-to-one time with the therapist inside a group session.
3. **Cohort assembly.** Reduce waiting time and eliminate empty seats by predicting no-shows,
   overbooking deliberately, backfilling from a waitlist, and assembling cohorts automatically. This
   turns fill rate — the core economic lever — into something the system controls.
4. **Foreground facilitation during live sessions**, with in-session prompts to help manage
   turn-taking and draw in quiet participants. This is the feature the patient-facing designs
   already anticipate, and it requires the safety position in Section 7 to be settled first.
5. **Expanded in-session risk assessment**, moving risk detection from batch toward real time. This
   follows item 4 deliberately: we take on a real-time safety claim only once the real-time
   infrastructure and the clinical taxonomy are both proven.
6. **AI-assisted assessment** to reduce the intake bottleneck and shorten waiting time.
7. **Health record integration and scheduling**, to cut the remaining administrative burden.
8. **Payer integration** for faster reimbursement cycles.
9. **Automated outcomes reporting to referral sources**, which closes the loop back into the demand
   engine described in Section 7.
