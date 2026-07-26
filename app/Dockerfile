# BrioCare on Cloud Run. Multi-stage so the runtime image carries only the standalone server.
# TEST DATA ONLY — see docs/security-compliance.md before this goes near real PHI.

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# package.json pins packageManager, so corepack installs the same pnpm the lockfile was written
# with. Without the pin corepack grabs the newest pnpm, whose supply-chain and build-script
# policies reject a v9 lockfile.
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The Prisma client is generated into src/generated/prisma and is gitignored, so it must be
# produced inside the image. prisma.config.ts loads dotenv; no database is contacted here.
RUN pnpm prisma generate
RUN pnpm build

# ---- runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run injects PORT; default matches its convention.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` bundles the server plus only the node_modules it actually needs.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
