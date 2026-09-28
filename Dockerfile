# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: install exactly what's in the lockfile ---------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- tools: full source + dev deps (dev server, migrations, seed, unit tests)
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ---- builder ----------------------------------------------------------------
FROM tools AS builder
# `next build` evaluates route modules, and Better Auth refuses to initialise
# in production without a secret. This placeholder exists only for this RUN
# step; the runtime image never sees it and must get the real secret from env.
RUN BETTER_AUTH_SECRET=build-time-placeholder-never-used-at-runtime npm run build

# ---- runner: minimal standalone production server ---------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/auth/ok || exit 1
CMD ["node", "server.js"]
