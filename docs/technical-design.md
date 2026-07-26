# BrioCare — Architecture Overview

A short, accurate description of what the Phase-1 system actually does. Every claim here was checked
against the code; where the implementation differs from an older doc, this file follows the code and
says so. For the product argument see `product-requirements.md`; for the exhaustive version see
`technical-design.md`.

**One thing to be clear about up front: no audio is ever recorded or stored.** Speech is transcribed
in flight and only text and behavioral telemetry are persisted. Section 6 explains exactly how.

---

## 1. Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) + React 19, TypeScript |
| Data | Prisma 7 → **MySQL 8** (`prisma/schema.prisma` sets `provider = "mysql"`; local Docker on port 3307) |
| Video | Daily (CPaaS), embedded as Daily Prebuilt |
| Speech→text | Deepgram, reached **through Daily's live transcription** (see §6) |
| Note generation | Claude — `NOTE_MODEL` and `VERIFY_MODEL` are both `claude-opus-4-8` (`src/lib/ai.ts`) |

There is no REST API layer. Server Components read the database directly through the query modules
in `src/lib/`; all mutations are Server Actions. The only HTTP endpoints are two capture-ingest
routes and three dev-only simulator routes.

> `build-plan.md` still says Postgres. The schema says MySQL. MySQL is correct.

---

## 2. High-level shape

```
   Browser                          Next.js server                    External
   ───────                          ──────────────                    ────────
                     ┌── proxy.ts (shared-secret cookie gate) ──┐
                     │                                          │
 /therapist  ────────┤  Server Components ── src/lib/queries.ts ─┼──► MySQL
 /patient    ────────┤  Server Actions   ── src/lib/actions.ts  ─┤
 /admin      ────────┘                                          │
                                                                │
 LiveRoom.tsx ──► POST /api/session/[id]/events ────────────────►│  (EngagementEvent)
 (daily-js)   ──► POST /api/session/[id]/transcript ────────────►│  (Transcript text)
      │                                                          │
      └──────────── WebRTC media ──────────────────────────────────► Daily ──► Deepgram
                                                                              (streaming)

                     processSession()  ── src/lib/pipeline.ts ───┼──► Claude (notes + verify)
                     (manually triggered)                        └──► MySQL
```

**Three surfaces**, each with its own route group and nav: `/therapist` (dashboard → cohort caseload
→ live room / note review / per-teen detail), `/patient` (home, check-in, group, practice, join),
`/admin` (read-only rosters). `/` is the marketing landing page.

**Access control is a single shared password**, not authentication. `src/proxy.ts` checks one
`bc_gate` cookie derived from one site-wide credential and redirects to `/login` if absent (API
routes get a 401 instead, so a POST can't "succeed" by following a redirect). Behind the gate there
is no per-user identity: actions resolve the acting clinician with `prisma.clinician.findFirst()`
and patient pages resolve a demo patient. Real auth, roles, and ownership checks are Phase 2.

---

## 3. Session lifecycle

`Session.status` is the spine of the whole system:

```
SCHEDULED ──► LIVE ──► ENDED ──► PROCESSING ──► READY
                                      │
                                      └──────► FAILED
```

- `SCHEDULED → LIVE` and `LIVE → ENDED` are driven by the therapist's **Start**/**End session**
  buttons (`setSessionStatus` in `actions.ts`). Ending a session also schedules the cohort's next
  one, unless the programme's fixed session count is already reached.
- `ENDED → PROCESSING → READY` is the batch pipeline (§7).
- The Daily room is provisioned **lazily** — only when status is `LIVE`. A scheduled session has no
  room, so a teen can't land alone in a room nobody started.

**The pipeline does not run automatically when a session ends.** It is triggered by a clinician
pressing **Generate notes**, either on the ended live page or in note review
(`processSessionAction`). There is no queue, no cron, no webhook — this is a deliberate Phase-1
simplification, not an oversight, but it does mean an ended session sits with no notes until someone
asks for them.

---

## 4. Core data model

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

> `MediaTrack.gcsUri` is named for a Google Cloud Storage object. **No such object exists.** The
> field only ever holds a marker string: `daily-live://<sessionId>` or `synthetic://<profile>`. The
> name describes an intended future, not current behavior.

---

## 5. Live flow (during the session)

The rule during a live session is **capture only — the AI produces no output**. No prompts to the
clinician, none to the teens, no real-time risk detection. The clinician runs the room.

1. **Therapist starts the session.** Status → `LIVE`. The live page calls `ensureRoom(sessionId)`
   (idempotent create of a private Daily room, video and audio starting off) and `mintToken(...)` for
   a short-lived meeting token — owner for the clinician, member for each teen.
2. **Everyone joins on their own device.** This is the load-bearing design decision: one clean
   near-field stream per person, so **speaker identity is a property of the connection**, not
   something a model has to infer from a shared room.
3. **Behavioral events are captured.** `LiveRoom.tsx` listens to Daily participant events, buffers
   them, and POSTs to `/api/session/[id]/events`, which writes `EngagementEvent` rows. The route
   accepts only the seven event types above — its own comment notes "no transcript/PHI text."
4. **Speech is transcribed live.** Daily's transcription (Deepgram streaming under the hood) emits
   `transcription-message` events into the browser. The client buffers `{patientId, text, startMs,
   endMs}` and POSTs to `/api/session/[id]/transcript`, which appends to that teen's
   `Transcript.segments` and stamps the track `daily-live://<sessionId>`.
   - **Every connected client captures the same room-wide stream**, not just the facilitator's, and
     the server dedupes on `(startMs, text)`. This is why one clinician refresh no longer kills the
     transcript for the whole room.
5. **What the clinician sees:** live speaking-time bars per member, a running transcript, and an
   "AI silent" chip. Nothing is generated or suggested.

**Audio is never written to disk.** It travels teen's device → Daily → Deepgram's streaming API and
comes back as words. We persist the words. There is no `enable_recording` on the room
(`src/lib/daily.ts`), no start/stop-recording call, no recording webhook, and no storage client in
the project.

---

## 6. Where speech-to-text actually happens

This is the part most easily misread, so it is worth stating exactly.

**Deepgram is used once, in one way: as a streaming service behind Daily's live transcription.** It
receives audio during the call and returns text. It never fetches, reads, or processes a recording,
because no recording exists.

There *is* a second, unused code path. `src/lib/asr.ts` implements `DeepgramProvider.transcribe()`,
which calls Deepgram's **pre-recorded** endpoint by handing it a URL to fetch. It is double-gated and
**never executes on a real session**:

- `getAsrProvider()` returns `null` unless `ASR_PROVIDER=deepgram` (the default is `daily`), and
- the pipeline only calls it when `isRealAudioUrl(gcsUri)` passes, which requires an `http(s)://`
  URL — and nothing in the application ever writes one.

So flipping the env var does not switch the system to batch transcription; it falls through to
fixtures. The provider has only ever run against a public sample clip in `scripts/asr-test.ts`, which
exists to de-risk the vendor ahead of the recording work. **Using that path in production would
require recording and storing per-participant audio, which is not built and is a separate consent and
retention decision.**

**Known gap:** `lowConfSpans` is populated by filtering segments with `confidence < 0.6`, but the
live capture path never sends a confidence value (`LiveRoom.tsx` pushes only patient, text, and
timings). So on every session that can actually run today, `lowConfSpans` is empty and no passage is
marked low-confidence — despite that being a stated product commitment.

---

## 7. Batch flow (after the session)

`processSession(sessionId)` in `src/lib/pipeline.ts`. Sets status `PROCESSING`, and on any throw sets
`FAILED` rather than leaving a half-written session looking finished.

**Step 1 — Engagement.** `recomputeEngagement(sessionId)` turns raw `EngagementEvent` rows into an
`EngagementMetric` per teen: talk seconds, turns, camera %, presence %, chat count, combined into a
weighted, soft-capped **participation index** (talk 0.35, turns 0.25, camera 0.15, presence 0.15,
chat 0.10; each input capped so one loud member can't saturate the score). Status comes from the
delta against that teen's own `Baseline` — never against the cohort.

**Step 2 — Resolve a transcript, per teen.** Strict priority:

1. **Daily live capture** — the track is `daily-live://…` and has segments. *This is the only branch
   that fires on a real session.*
2. **Deepgram pre-recorded** — requires a real audio URL. **Unreachable today** (§6).
3. **Synthetic fixtures** (`src/lib/fixtures.ts`) — `profileForStatus()` picks one of six canned
   transcripts (`withdrawn`, `withdrawn_flagged`, `engaged`, `improving`, `brief`, `absent`) from the
   teen's engagement status and attendance. *This is what runs on seeded demo data.*

**Step 3 — Generate a grounded individual note** (`groundedIndividualNote` in `notegen.ts`), per teen,
four at a time:

- **Generate** — Claude drafts four sections plus goal signals, from that teen's transcript, their
  goals, the session module, and a one-line participation summary built from Step 1.
- **Verify** — every claim is checked independently:
  - no evidence cited → `UNSUPPORTED`
  - metric evidence only → `SUPPORTED` automatically (it's our own measured data)
  - transcript evidence → a **second model call** judges whether the quotes substantiate the claim,
    returning `SUPPORTED` / `UNSUPPORTED` / `UNCERTAIN`. Claims citing both are shown both, so a
    sentence reconciling narrative with signal isn't penalised.

**Step 4 — Risk scan.** `scanForRisk()` runs over the transcript and writes `RiskFlag` rows with a
12-hour SLA. **This is a regex stub, not a clinical detector** — every flag's evidence is stamped
`[SYNTHETIC STUB — not a clinical detection]`. The workflow around it is real; the detector waits on
a signed-off clinical taxonomy.

**Step 5 — Group note.** One session-level note generated from all members' summaries. It is
aggregate prose; claim-level grounding rigor lives in the individual notes.

**Step 6 — Finish.** Status → `READY`, plus a `session.processed` audit event.

Note writes are destructive-then-recreate inside a transaction, and the pipeline refuses to write a
note with zero sections rather than replacing real content with an empty record.

---

## 8. Review and approval

Notes land as `DRAFT` in the review console. The clinician edits sections, expands **Show evidence**
to see each claim's source (`Grounded` / `Partial` / `Inferred`), dispositions any risk flag, and
approves. Every save, attestation, disposition, and approval writes an `AuditEvent`.

**What `approveNote()` actually enforces server-side — two gates, not three:**

1. The note must have at least one section (an empty note can't be signed into a chart).
2. There must be **no unresolved `ACUTE` risk flag** for that session and patient.

**Grounding is advisory, not a hard block.** Ungrounded claims are surfaced and the clinician attests
them; the signature is the clinician's single attestation. `approveGroupNote()` applies the same two
gates, but any member's unresolved acute flag blocks the group note, since it describes the whole
room.

> Worth stating plainly, because the stricter reading is the intuitive one: this is **not** a
> two-part grounding-and-safety gate. Earlier internal notes described approval as blocked by "no
> ungrounded claims **and** no unresolved ACUTE risk flag," and that is not what the code does —
> only the acute-flag gate is hard. The looser behaviour is deliberate and matches the open question
> in `product-requirements.md` §14, where the trade-off is explicitly left to a clinician's
> judgment. It is called out here so the discrepancy is not mistaken for an implementation bug.

Approved notes are copied into whatever EHR the practice uses. There is no EHR integration.

---

## 9. What is deliberately not built

Stated plainly, because several are things a reader would reasonably assume:

- **No audio recording or storage**, and therefore no batch transcription of recordings (§6).
- **No real-time AI output** — no live prompts, no live risk detection.
- **No authentication** beyond one shared site password; no roles, no ownership checks.
- **No real risk detection** — regex stub, visibly labelled.
- **No consent enforcement** — `ConsentRecord` is modeled but nothing checks it.
- **No EHR integration, no treatment planning, no cohort assembly or scheduling automation.**
- **No automatic pipeline trigger** — notes are generated on demand.
- **No parent-facing surface.**
- **No real PHI, anywhere.** Database, fixtures, and seeds are entirely synthetic, and the local
  MySQL instance is test-data-only.

---

## 10. Verification

There is no test runner. Each stage has a `tsx` script that exercises it end-to-end against real
services, run from `app/`:

```bash
pnpm tsx scripts/asr-test.ts        # Deepgram pre-recorded provider against a public sample clip
pnpm tsx scripts/notegen-test.ts    # generate → verify → verdicts on a synthetic transcript
pnpm tsx scripts/pipeline-test.ts   # full processSession() on the latest Tuesday session (limit 2)
pnpm build                          # the only real typecheck gate
```
