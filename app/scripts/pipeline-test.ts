import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { processSession } from "../src/lib/pipeline";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL ?? "") });

(async () => {
  const cohort = await prisma.cohort.findFirst({ where: { name: { startsWith: "Tuesday" } } });
  const session = await prisma.session.findFirst({ where: { cohortId: cohort!.id }, orderBy: { index: "desc" } });
  if (!session) throw new Error("no Tuesday session");
  console.log(`Processing ${cohort!.name} · Session ${session.index} (limit 2)…`);
  const t0 = Date.now();
  const res = await processSession(session.id, { limit: 2 });
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(JSON.stringify(res, null, 2));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
