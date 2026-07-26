import { cookies } from "next/headers";

/**
 * Gate for the AI-patient simulator (`/api/sim/*` + the "Simulate via AI" tile control).
 *
 * Always on in dev. Anywhere else — including the Cloud Run demo, which builds with
 * NODE_ENV=production — it must be opted into with ENABLE_AI_SIM=1. The gate stays rather than
 * being deleted because these routes mint Daily room tokens and spend Anthropic + Deepgram
 * credits, and the app has no auth: a deployment that doesn't want that surface open shouldn't
 * get it by default. Read at request time (not NEXT_PUBLIC_, not inlined at build), so the same
 * image can be deployed with the simulator on or off.
 */
export function simEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_AI_SIM === "1";
}

// Dev-only "simulate as" selection, stored in cookies by the DevBar. Lets you switch which
// therapist / patient the views resolve to without editing the DB.
export async function simClinicianId(): Promise<string | undefined> {
  return (await cookies()).get("sim_clinician")?.value || undefined;
}
export async function simPatientId(): Promise<string | undefined> {
  return (await cookies()).get("sim_patient")?.value || undefined;
}
