import "server-only";
import { prisma } from "./db";
import { DEFAULT_DIRECTOR_MODEL, DIRECTOR_MODELS } from "./director-models";

// Operator settings that apply to everyone and survive restarts, chosen in the admin console.
// Distinct from the DevBar's sim_* cookies, which are per-browser.

const DIRECTOR_MODEL_KEY = "sim.directorModel";

/** The model the AI-patient director runs on. Falls back to the default if unset or unrecognised. */
export async function getDirectorModel(): Promise<string> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: DIRECTOR_MODEL_KEY } });
    const chosen = row?.value;
    return DIRECTOR_MODELS.some((m) => m.id === chosen) ? chosen! : DEFAULT_DIRECTOR_MODEL;
  } catch {
    // A missing table (migration not applied yet) shouldn't take the simulator down.
    return DEFAULT_DIRECTOR_MODEL;
  }
}

export async function setDirectorModel(modelId: string): Promise<void> {
  if (!DIRECTOR_MODELS.some((m) => m.id === modelId)) throw new Error("unknown director model");
  await prisma.appSetting.upsert({
    where: { key: DIRECTOR_MODEL_KEY },
    create: { key: DIRECTOR_MODEL_KEY, value: modelId },
    update: { value: modelId },
  });
}
