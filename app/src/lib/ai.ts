import Anthropic from "@anthropic-ai/sdk";

// MVP (test data): direct Anthropic API. Production swaps this constructor for `AnthropicVertex`
// (GCP) per docs/security-compliance.md — the `messages` surface is identical, so only this file
// changes. Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic();

// Model IDs. Note-gen + risk triage on the strongest model; the tiny per-claim verifier can run
// cheaper without quality loss. (See docs/grounding-contract.md.)
export const NOTE_MODEL = "claude-opus-4-8";
export const VERIFY_MODEL = "claude-opus-4-8"; // can drop to a cheaper tier for cost; keep for now

// The AI-patient simulator's turn director (dev-only). Chosen for latency, not cost: it sits
// between the therapist finishing a sentence and a bot answering, so seconds are felt. Swap to
// "claude-haiku-4-5" if turns still feel slow. Note Sonnet 5 runs adaptive thinking by DEFAULT —
// callers must pass thinking:{type:"disabled"} to keep the turnaround short.
export const DIRECTOR_MODEL = "claude-sonnet-5";
