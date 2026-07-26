import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 requires a driver adapter. MySQL (Cloud SQL) via the mariadb driver.
// Singleton-cached in dev to survive Next.js hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  // On Cloud Run the database is reached over the unix socket that `--add-cloudsql-instances`
  // mounts at /cloudsql/<connection name>; there's no host/port to dial. Locally it's a plain
  // mysql:// URL against the Docker container. PrismaMariaDb accepts either a connection string
  // or a mariadb PoolConfig, and only the config form can carry a socketPath.
  const socketPath = process.env.DB_SOCKET_PATH;
  const adapter = socketPath
    ? new PrismaMariaDb({
        socketPath,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      })
    : new PrismaMariaDb(process.env.DATABASE_URL ?? "");
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
