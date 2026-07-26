import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { resetAll, seedDemoData } from "../src/lib/seed-core";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

async function main() {
  await resetAll(prisma);
  const org = await seedDemoData(prisma);
  console.log(`Seeded org=${org.name} (Tuesday/Thursday/Monday cohorts + Tuesday S6 draft notes).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
