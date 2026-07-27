# BrioCare — Product Requirements

## 1. Problem

Pediatric group therapy should be a scalable, effective part of behavioral health, but it often underperforms because therapists have to manually manage participation, pacing, and structure while also providing care. They are also overloaded with pre- and post-session administrative work, which erodes the quality of care. And the children who most need to be drawn in — the quiet or socially anxious ones — often participate least.

## 2. Solution

BrioCare is a telehealth behavioral health provider — clinician-supervised, group-first, built
around a proprietary AI co-facilitator that runs the mechanics of a structured group session so the
therapist can focus on the clinical work.

Three commitments define the shape of the product.

**We are the provider, not the software.** We employ or contract the clinicians, we bill the payer,
and we deploy the AI inside our own program. This captures the reimbursement rather than a software
licence fee, and it means we control how the AI is used rather than hoping a customer uses it well.

**The clinician is always in control.** The AI assists before, during, and after therapy sessions. It does not decide, and
it does not treat. This is a clinical safety position first, and it is also what keeps the product
out of FDA medical-device territory, which matters enormously for a product serving minors in mental
health.

**Virtual by default.** Every participant joins from their own device, which means every participant
is a separate clean audio stream. That single fact is what makes the whole technical approach
viable — see Section 6, risk 2.

## 3. User Segments

### Primary users

**Therapists.** The primary user of the co-facilitator, and the user whose day the product changes
most. Everything in the first version is built for them.

**Teen patients.** The people receiving care. They are not the buyer and usually not the decision-maker, but they are the ones who drop out, so the product has to earn their willingness to keep showing up.

**Parents and guardians.** They control attendance, consent, and whether the teen keeps coming,
which makes them a retention engine rather than a peripheral audience. The published evidence points
the same way: in a study of 1,487 patients in a telehealth IOP, 83.2% completed treatment when
families attended family therapy sessions, against 59.2% when they did not.[^1] Two caveats matter
for how much weight that carries. It measured attendance at family therapy specifically, not parent
involvement in general — a narrower thing than the parent-engagement layer on our roadmap. And it is
retrospective and observational, so it shows association, not cause; families who opt into therapy
may differ in ways that independently predict completion.

[^1]: Berry KR, Gliske K, Schmidt C, Ballard J, Killian M, Fenkel C. "The Impact of Family Therapy
Participation on Youths and Young Adult Engagement and Retention in a Telehealth Intensive Outpatient
Program: Quality Improvement Analysis." *JMIR Formative Research*. 2023;7:e45305. doi:10.2196/45305.

### Secondary stakeholders

**Referral sources** — emergency-department discharge planners, inpatient social workers, school
counselors, and pediatricians. They generate demand and, over time, become the defensible part of
the business. See Section 6, risk 4.

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

## 4. Target Users

The pediatric mental health market divides into two meaningful segments: school-age children roughly
6 to 12, and adolescents roughly 13 to 17.

The initial brief pointed toward the 6–12 group. Based on my research I favor adolescents instead,
and within that group our beachhead is the **14–17** sub-band. Five reasons, in the order I weight
them.

**1. The group format fits teenagers developmentally.** Fitting in with peers and figuring out who they are is central to being a teenager. A therapy group works
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

## 5. Critical product decisions


| Decision            | Choice                                                       | Reasoning                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool or provider    | **Provider**                                                 | Captures the reimbursement rather than a software fee, and lets us control how the AI is actually deployed instead of hoping a customer deploys it well.                                                                                          |
| Role of the AI      | **Co-pilot and co-facilitator, clinician always in control** | The AI assists; it never delivers therapy. This keeps us out of FDA medical-device classification, which is close to non-negotiable for a minors plus mental-health product.                                                                      |
| Age band            | **Adolescents 14–17, not 6–12**                            | The group modality is developmentally suited to teens, the referral pipeline and IOP economics are both teen-centric, voice AI is far more tractable, and teens can self-engage. Choosing 14 as the floor also puts us above the COPPA threshold. |
| Condition beachhead | **Moderate-to-high-acuity anxiety and depression**           | The largest and most group-amenable population. It also avoids the additional regulatory burden of substance use disorder treatment (42 CFR Part 2) and the medical-acuity risk of eating disorders.                                              |
| Care level          | **Intensive outpatient program (IOP)**                       | Per-diem billing is the actual economic engine, and IOP is fed directly by the warm crisis and step-down referral pipeline.                                                                                                                       |
| Delivery            | **Virtual**                                                  | Gives every participant a separate clean audio stream, which is what makes per-participant transcription and participation measurement possible at all.                                                                                           |

---

## 6. Critical risks and how we address them

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

## 7. Existing user journeys — how care works today

The research the product is built on: what each of the three people in this system experiences,
stage by stage, and where it hurts. The pattern at the end is what the first version targets.

### The teenager

1. **Struggle, then crisis.** Symptoms build for months; it often takes an emergency department
   visit, panic attack, school refusal, or self-harm before anyone acts. Shame, fear, and not knowing
   how to ask for help — and an ED that is not built for pediatric mental health.
2. **Referral, then waitlist.** An adult refers; the teen waits weeks. No agency: adults decide
   everything about them, largely without them, while they continue to deteriorate.
3. **Intake and assessment.** Paperwork, a long biopsychosocial interview, and screeners (PHQ-9/A,
   GAD-7, C-SSRS), often repeated for a coordinator, a clinician, and a psychiatrist — usually with a
   parent in the room. Retelling the worst moments repeatedly is retraumatizing, and with a parent
   present the teen cannot be honest about self-harm, substance use, suicidality, or home.
   **The emotional harm and the data failure are the same failure:** intake collects inaccurate data
   *and* teaches the teen that honesty is not safe, producing the wrong risk level, cohort match, and
   treatment plan before the first session.
4. **First session.** Dropped into a virtual group of strangers — for a socially anxious adolescent,
   precisely the feared situation. Dread about the camera, fear of judgment, and immediate alienation
   if the match on age or acuity is poor.
5. **Early weeks — the highest-dropout window.** Guarded and withdrawn, testing whether the group is
   safe. It is very easy to be invisible and have nobody draw you in; add skepticism, stigma about
   missing class, and often no private space to attend from. **This is where teenagers silently
   decide to quit** — the single most important window in the journey.
6. **Mid-program.** Fit is left to chance. Bond with the cohort and it works; otherwise they check
   out. A dominant peer or unresolved conflict alienates quickly, home practice is hard, and the
   worry about who might find out never goes away.
7. **Discharge.** Losing the community they finally built, fear of relapse, an abrupt "graduation",
   and a return to the same school and family environment that contributed to the problem.

### The parent

1. **Noticing, then crisis.** Slow realization or a sudden discovery — self-harm, a suicidal comment,
   an ED trip, a call from school. Fear, guilt, stigma, and no idea where to turn.
2. **Finding care.** Cold-calling providers, waitlists, and the insurance maze — often with nothing
   but a list of phone numbers from the ED. No map, no sense of what level of care their child needs,
   and bouncing between providers while the teen deteriorates.
3. **Intake and enrollment.** Forms, consent, and authorization battles in crisis mode, real
   financial fear, and the logistics of work, siblings, and getting the teen to agree to go at all.
4. **Program start and early weeks.** Confidentiality shuts them out, so they do not know what
   happens in session or whether it is working — while the whole logistical burden lands on them with
   no guidance on how to help.
5. **Mid-program and between-session crises.** Sporadic updates, no way to reinforce the work at
   home, and the eleven-o'clock moment: a bad night, nobody to call, and no way to tell an emergency
   from a normal hard evening. They carry that risk alone.
6. **Discharge.** Fear at losing the safety net, no clarity on what comes next, and back to managing
   alone.

### The therapist

1. **Referral intake and cohort assembly.** A manual scheduling puzzle in spreadsheets. Teens are
   placed by seat availability rather than clinical fit, so groups mix ages and acuity and cohesion
   suffers; admission is slow and some teens never start.
2. **Pre-session preparation.** Reviewing notes, plans, and incidents for eight to ten teenagers in
   the gap between back-to-back sessions. Records are scattered across the EHR and there is no time,
   so the therapist walks in cold and runs the group from memory.
3. **Running the live group.** 60–90 minutes of curriculum, dynamics, de-escalation, drawing in the
   quiet, and scanning every face for risk — on a video grid. Attention is divided past the point of
   effectiveness, there is no objective record of who participated, and subtle disengagement and risk
   cues slip past.
4. **Post-session documentation.** An individualized progress note per teen plus a group note, for
   billing and compliance, usually after hours. **The number one driver of burnout** — and the hard
   ceiling on caseload, since administrative load rather than clinical capacity decides how many
   teenagers one therapist can carry. Rushed or late notes also create audit exposure.
5. **Between-session monitoring.** No caseload-level view, so dropout is noticed only when a teen
   stops showing up — too late to act. Parent outreach falls off the bottom of the list and team
   coordination is fragmented across phone, email, and the EHR.
6. **Family engagement.** The factor that most drives completion gets the least attention: parents
   get sporadic contact and calls are handled reactively. Parents who feel shut out pull their child
   out.
7. **Discharge and outcomes reporting.** Manual, and there is no time — so the discharge summary and
   outcomes report back to the referrer frequently just does not happen, quietly starving the
   referral relationship that produced the patient.

## 8. Biggest Pain Point Across All Journeys

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

## 9. MVP Focus

The MVP targets that pain directly: helping therapists see and act on declining participation.

Section 8 explains why participation drops — the therapist has no visibility into it, and no time to
build any. The MVP attacks both halves of that. It makes participation visible as a per-teen signal
trended between sessions, and it removes the documentation load that consumes the time needed to act
on what the signal shows.

## 10. MVP Journey

1. **Referral → cohort assembly** — out of scope for MVP.

   A coordinator hand-builds the single pilot cohort and enters it into the portal.

2. **Pre-session prep** — in scope for MVP.

   - *What:* from the cohort caseload the therapist opens a per-kid view — participation trended
     against that teen's own baseline, plus their note history.
   - *Purpose:* tactical prep for the room about to run — "who do I watch or draw in today?" It
     drives better facilitation inside the upcoming session, so it points INTO the room.

3. **Background assistant during the live session** — in scope for MVP.

   Background capture of per-participant transcription and behavioral telemetry (speaking time,
   camera on/off, presence, chat). Audio is transcribed live and never recorded or stored — only the
   transcript and the telemetry are kept. No in-session prompts from the AI in the MVP: during the
   session the AI is silent and the clinician runs the room as today.

4. **Post-session documentation** — in scope for MVP.

   After the session, the captured per-teen transcript and telemetry feed a batch pipeline →
   individualized draft progress note per kid (tied to goals) + group note. The therapist reviews,
   edits, and approves in the review UI, then pastes into their own EHR. Hours of charting become
   minutes.

5. **Between-session engagement signal** — in scope for MVP.

   - *What:* per-kid participation trended across all sessions → a caseload view showing who is
     worth a look.
   - *Purpose:* strategic retention — "who's trending toward dropout?" It drives intervention
     between sessions (a check-in now; a parent nudge in P1), so it points BETWEEN rooms.
   - *Participation is behavioral signals only:* talk time, number of turns, camera on/off,
     attendance and presence, chat activity — shown as a trend against the kid's OWN baseline, not
     kid against kid. These are proxies rather than truth, so the signal says "worth a look" and the
     clinician interprets it. The AI never labels a kid "disengaged."

6. **Family and parent engagement** — out of scope for MVP.

   The therapist contacts parents manually in the pilot. The notes and the engagement signal are
   exactly what feeds the parent layer.

7. **Discharge and outcomes reporting** — out of scope for MVP.

   Approved notes and participation data can auto-compile a basic end-of-pilot outcomes summary.

## 11. AI Requirements

**Participation metrics.** Derive behavioral telemetry from the session: how long each teenager
spoke, how many times they entered the conversation, how long their camera was on, how much of the
session they were present for, and chat activity. These come from meeting events rather than from
the transcript.

**Individual notes.** Use the teenager's own transcript plus their telemetry to draft a note for
clinician review. Four sections plus goal-progress signals. Every clinical claim inside a section carries its own
evidence — a transcript span or a telemetry figure — so the therapist can verify each one rather
than trust the note as a whole.

**Group notes.** Generate a session-level group note from the same inputs, with four sections and
two cohort-level goal indicators.

**Risk scanner.** Scan for self-harm signals, tuned for high recall rather than precision. It runs
in batch at the end of the session rather than in real time. Flags go to the clinician with
transcript evidence, require a disposition, and an unresolved acute flag blocks note approval.

A note on the risk scanner's current state: the detection component ships as a deliberately obvious
placeholder rather than a real clinical detector.

## 12. Success Metrics

### Documentation

- Total post-session charting time down **60% or more** against the write-from-scratch baseline.
- **70% or more** of drafts approved with only light editing, measured by edit distance.
- **90% or more** of notes meet IOP medical-necessity documentation criteria on review by a
  clinician or biller.

### Engagement signal

- The signal flags a declining teenager **one to two sessions earlier** than an unaided clinician
  would notice, and before a no-show.

### Safety

- Self-harm scan **recall of 95% or better** on a seeded evaluation set built with clinical input.
- Every flag carries transcript-span evidence.

### Adoption and pilot outcome

- Pilot cohort completion rate compared against the historical baseline.
- Therapist intent to continue, and whether they say the product made them faster.

## 13. Roadmap

The roadmap items below are listed in order of importance:

1. Family / Parent Engagement: Improve completion rate
2. Breakout Sessions for short 1:1 time with therapists
3. Cohort Assembly: Reduce wait time for kids and parents and minimize empty seats. Treat it like airline seat management: predict no-shows, overbook, backfill from a waitlist, and auto-assemble cohorts
4. Foreground facilitation during live sessions with in-session prompts: Reduce burden on therapists and improve care quality
5. Expand the role of AI during in-session to assess risk cues
6. AI Assessment: Reduce wait time for kids and parents
7. EHR integration and scheduling: Reduce administrative burden on therapist and increase productivity
8. Payer integration for speedy reimbursements
9. Outcome reporting to referrer: Feed the demand engine
