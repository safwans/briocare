# BrioCare

An AI co-facilitator for teen group therapy. It works before, during, and after a session — helping
therapists prepare, capturing participation silently while the group runs, and drafting grounded
clinical notes afterwards for the clinician to review and sign.

This repository is a **Phase-1 demo**. It runs end to end against real services (Daily for video,
Deepgram for speech, Claude for note generation) on entirely synthetic data. Read
[What is deliberately not real](#what-is-deliberately-not-real) before drawing conclusions about
production readiness.

---

## The core invariant: notes are grounded or they don't ship

The product bet is that a clinician will only trust generated notes if every clinical claim can be
traced to evidence. So note generation is two passes, not one:

1. **Generate** a draft note from the session transcript and engagement telemetry.
2. **Verify** every claim independently. Each carries `evidence[]` pointing at either a transcript
   span (checked by a second model call) or the engagement summary (our own system data, so
   auto-supported). Each claim lands on a verdict: `SUPPORTED`, `UNSUPPORTED`, `UNCERTAIN`, or
   `CLINICIAN_ATTESTED`.

`approveNote()` enforces the gate server-side — not just in the UI — so a crafted request can't file
an ungrounded note or one with an unresolved acute risk flag. The escape hatch is `attestClaim()`,
where a clinician takes personal responsibility for a claim the verifier couldn't ground, and that
is audited.

Full contract: [`docs/grounding-contract.md`](docs/grounding-contract.md).

## Engagement, not surveillance

Raw call events become a weighted, soft-capped **Participation Index** (0–100), then a status
derived from each teen's delta against *their own* enrollment baseline — never against the rest of
the group. A quiet teen who stays quiet reads as stable; a talkative one who goes quiet is what the
system surfaces.

Copy discipline is part of the design: user-facing text never says "at risk". The internal
`CHECK_IN` key renders as "Check in", `WATCH` as "Worth a look".

Spec: [`docs/engagement-spec.md`](docs/engagement-spec.md).

---

## Architecture

Next.js 16 (App Router, React 19) · Prisma 7 on MySQL · Daily for video · Claude for note generation.

Server Components read the database directly through `src/lib/*` query modules; mutations are Server
Actions. There is no REST layer except two ingest routes under `src/app/api/session/[sessionId]/`.

**Session lifecycle** is the spine: `SCHEDULED → LIVE → ENDED → PROCESSING → READY` (or `FAILED`).

**Capture is separate from inference — the AI is silent during the call.** The live room only
records participant events and transcription messages. Everything else happens in a batch pipeline
afterwards: `recomputeEngagement()` → per-teen transcript → grounded note → group note → risk scan →
`READY`.

**Three surfaces**, each with its own route group: `/therapist` (caseload → live room → note
review), `/patient` (check-in, group, practice), `/admin` (rosters plus demo-data tools). `/` is the
public marketing page.

## Repository layout

| Path | What's in it |
|---|---|
| `app/` | The Next.js application. All commands below run from here. |
| `docs/` | The written source of truth. Code comments cite these by name. |

Start with [`docs/technical-design.md`](docs/technical-design.md) and
[`docs/product-requirements.md`](docs/product-requirements.md) — those two are the substantive
design documents. [`docs/build-plan.md`](docs/build-plan.md) tracks what is built and verified.

## Running it

Requires Node, pnpm, and Docker.

```bash
cd app
pnpm install
docker compose up -d db          # local MySQL 8 on port 3307 — test data only
pnpm prisma generate             # client is gitignored; required after every clone
pnpm prisma migrate deploy
pnpm prisma db seed              # demo org, cohorts, sessions, notes
pnpm dev                         # http://localhost:3000
```

Secrets go in `app/.env` (gitignored): `DATABASE_URL`, `DAILY_API_KEY`, `ANTHROPIC_API_KEY`,
`DEEPGRAM_API_KEY`.

The app sits behind a shared-secret gate; credentials come from `AUTH_USER` / `AUTH_PASS`.

### Verification

There is no unit-test runner. Verification is done with scripts that exercise one stage end to end
against real services:

```bash
pnpm tsx scripts/asr-test.ts       # Deepgram against a public sample clip
pnpm tsx scripts/notegen-test.ts   # generate → verify → verdicts on a synthetic transcript
pnpm tsx scripts/pipeline-test.ts  # full processSession() on a seeded session
```

`pnpm build` is the real typecheck gate.

### Schema changes

Migrations are **not** applied automatically on deploy. After changing `prisma/schema.prisma`, run
the migration job before shipping the image:

```bash
gcloud builds submit --config cloudbuild.migrate.yaml .
```

---

## What is deliberately not real

These are labelled in-code and are scope decisions, not oversights:

- **No authentication.** A single shared password gates the whole site. There is no per-user
  identity, no roles, and no ownership checks — actions resolve the acting clinician with
  `findFirst()`. Real auth is Phase 2.
- **Risk detection is a regex stub.** Flags are stamped `[SYNTHETIC STUB — not a clinical
  detection]`. The real taxonomy is blocked on clinical and legal sign-off, which is a decision for
  clinicians rather than engineers.
- **No PHI anywhere.** Database, fixtures, and seeds are entirely synthetic. The local MySQL
  container is explicitly test-data-only.
- **Consent is modelled but not enforced.** `ConsentRecord` exists; nothing checks it yet.

See [`docs/security-compliance.md`](docs/security-compliance.md) for the intended production posture.
