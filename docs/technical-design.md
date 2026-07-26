# BrioCare — Technical Design

## 1. System architecture

![](assets/20260726_073924_image.png)

BrioCare is a single Next.js 16 application on Cloud Run, backed by MySQL 8 on Cloud SQL. There is no separate backend and no internal API. Server Components read through query modules in `src/lib/`; Server Actions perform every mutation.

Five API routes exist, each because the browser is the origin of the data: two ingest routes take transcript segments and participation telemetry out of the session room, and three dev-only routes serve the AI patient simulator.

Vendor code is confined to a small set of modules: `daily.ts` (rooms and tokens), `ai.ts` (model IDs) and `db.ts` (the Prisma client) on the live path. The live room runs `daily-js` directly in the browser as a call object with our own UI, and the simulator's speech route calls Deepgram directly.

A therapy session splits into two phases with a hard line between them. **During the session the system captures and displays but never infers** — no model runs while the room is open. **After the session** a batch pipeline resolves transcripts, computes engagement, and drafts notes. Nothing in the product needs a model response during the hour, and keeping inference out of the room removes an entire class of failure from a clinical setting with minors in it.

## 2. Technical stack


| Layer           | Choice                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| App             | Next.js 16 (App Router) + React 19, TypeScript                                                       |
| Data            | Prisma 7 →**MySQL 8** (`prisma/schema.prisma` sets `provider = "mysql"`; local Docker on port 3307) |
| Video           | Daily (CPaaS), driven as a**call object** (`createCallObject`) with our own UI, not Daily Prebuilt   |
| Speech → text  | Deepgram, reached**through Daily's live transcription**                                              |
| Note generation | Claude —`NOTE_MODEL` and `VERIFY_MODEL` are both `claude-opus-4-8` (`src/lib/ai.ts`)                |

## 3. Session lifecycle

![](assets/20260726_072654_image.png)

`Session.status` is the spine of the whole system:

```
SCHEDULED ──► LIVE ──► ENDED ──► PROCESSING ──► READY
                                      │
                                      └──────► FAILED
```

* `SCHEDULED → LIVE` and `LIVE → ENDED` are driven by the therapist's Start and End buttons.
* Ending a session schedules the cohort's next one, unless the programme's fixed session count is already reached. That bound is what makes an IOP finite rather than an open series.
* The Daily room is provisioned **lazily**, only on entry to `LIVE`. A scheduled session has no room, so a teen cannot land alone in a room nobody started.
* `ENDED → PROCESSING → READY` is the batch pipeline, **triggered by hand**. Ending a session does not start it — a clinician presses Generate notes. No queue, no cron, no webhook.

## 4. Live flow (during the session)

The rule is capture only: no prompts to the clinician, none to the teens, no real-time risk detection. The clinician runs the room.

**Everyone joins on their own device.** This is the load-bearing decision. One clean near-field stream per person makes speaker identity a property of the connection rather than something a model has to infer from a shared room, which is what makes per-teen attribution reliable enough to cite in a note.

**Capture is redundant on purpose.** Daily transcribes the room and every connected browser posts what it hears to the transcript ingest route, which de-duplicates server-side — so one participant refreshing no longer costs the transcript for everyone. Behavioral events go to a second ingest route that accepts no text content of any kind. Wire formats and the Daily domain setup are in `docs/cpaas-integration.md`.

**The clinician sees the room, not an analysis.** Live speaking-time bars, a running transcript, and a chip reporting whether transcription is actually live. Nothing is generated or suggested.

**Audio is never written to disk.** It travels from the teen's device to Daily to Deepgram's streaming API and returns as words. We persist the words. There is no recording enabled on the room, no recording webhook, and no storage client in the project.

## 5. Batch flow (after the session)

**1 — Engagement.** Raw events become an `EngagementMetric` per teen: a weighted, soft-capped **participation index** over talk, turns, camera, presence and chat. Each input is capped so one loud member cannot saturate the score, and status comes from the delta against that teen's own `Baseline` — never against the cohort.

**2 — Resolve a transcript, per teen.** Live capture when the session was transcribed; synthetic fixtures otherwise.

**3 — Draft a grounded note,** four teens at a time. Claude writes four sections plus goal signals from that teen's transcript, their goals, the session module, and a one-line participation summary from step 1. It also returns `signalAlignment`, a verdict on whether the narrative and the measured signal agree — without it a note can read “engaged and forthcoming” while the caseload shows the same teen well below baseline, and a clinician skimming the prose never sees the contradiction.

**4 — Verify every claim independently.** A second pass judges each claim against only its own cited evidence, so the verifier cannot be talked into agreeing by the surrounding prose. Claims land `SUPPORTED`, `UNSUPPORTED` or `UNCERTAIN` and the clinician sees which is which.

**5 — Risk scan, group note, then `READY`,** plus a `session.processed` audit event. The group note is aggregate prose — claim-level grounding rigor lives in the individual notes.

Notes are never merged on a re-run. Writes are destructive-then-recreate inside a transaction, and the pipeline refuses to write a note with zero sections rather than replacing real content with an empty record.

## 6. Core data model

![](assets/20260726_080448_image.png)

Only the entities the two flows touch:

- **Org → Clinician / Patient → Cohort → Enrollment** — an Enrollment carries the teen's `Goal` rows
  and their `Baseline` (the anchored participation index the engagement signal compares against).
- **Session** — one group meeting, with `index`, `module`, `status`.
- **EngagementEvent** — raw behavioral events: `JOIN`, `LEAVE`, `CAMERA_ON`, `CAMERA_OFF`,
  `SPEAKING_START`, `SPEAKING_END`, `CHAT`. No text content.
- **EngagementMetric** — the derived per-teen, per-session figures: talk seconds, turns, camera %,
  presence %, chat count, `participationIndex`, `status`.
- **MediaTrack → Transcript** — one per (session, patient). `Transcript.segments` is the text;
  `lowConfSpans` holds segments below 0.6 confidence.
- **IndividualNote → NoteSection → NoteClaim**, and **GroupNote → NoteSection** — the notes, their
  sections, and the per-claim evidence and verdicts.
- **RiskFlag** — one per detected hit, with evidence, `severity`, `status`, `disposition`.
- **AuditEvent** — written by every mutating action.
