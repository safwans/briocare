// Shared-secret gate for the demo deployment.
//
// This is NOT the auth system. It is one shared credential in front of the whole site so only
// people we hand the password to can reach the demo — the app itself still has no per-user
// identity, no roles, and no ownership checks (see docs/technical-design.md §13). Real
// authentication and RBAC are Phase 2, gated on the compliance work in
// docs/security-compliance.md §4.
//
// Runs in both the proxy (edge runtime) and Server Actions (node), so it uses Web Crypto only —
// no node:crypto import.

// Credentials come from the environment ONLY, and the gate fails closed when they are missing.
//
// These used to carry literal fallbacks, which meant the repository contained a working password
// for a running deployment — and because git keeps history, deleting such a line does not unpublish
// it. Anything committed here is published permanently, so nothing usable may be committed at all.
// Set AUTH_USER / AUTH_PASS / AUTH_SECRET in the deployment and in a local .env (gitignored).
const USER = process.env.AUTH_USER;
const PASS = process.env.AUTH_PASS;
// Salts the cookie so its value isn't derivable from the credentials alone. Changing it in the
// deployment invalidates every existing session at once.
const SECRET = process.env.AUTH_SECRET;

/**
 * Fail closed. An unconfigured gate denies everyone rather than falling back to a known default —
 * a misconfigured deploy should lock us out, never let the public in.
 */
export function isConfigured(): boolean {
  return !!USER && !!PASS && !!SECRET;
}

export const AUTH_COOKIE = "bc_gate";
/** 12h — long enough for a review session, short enough that a shared laptop doesn't stay open. */
export const AUTH_MAX_AGE = 60 * 60 * 12;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent comparison so a wrong guess can't be narrowed by response timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Opaque cookie value. Deliberately not the password — a leaked cookie reveals no credential. */
export function expectedToken(): Promise<string> {
  return sha256Hex(`${USER}:${PASS}:${SECRET}`);
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token || !isConfigured()) return false;
  return timingSafeEqual(token, await expectedToken());
}

export async function verifyCredentials(user: string, pass: string): Promise<boolean> {
  if (!isConfigured()) return false;
  return timingSafeEqual(await sha256Hex(`${user}:${pass}:${SECRET}`), await expectedToken());
}

/**
 * Only allow same-site relative paths as a post-login destination. Without this, `?next=` is an
 * open redirect that lets someone send a BrioCare link that lands on their own page.
 */
export function safeNext(value: string | undefined | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
