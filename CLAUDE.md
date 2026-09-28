# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Requirements and coding standards live in `agents.md` (imported below). Treat it as the source of truth.

@agents.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

(The block above lives here, not in `agents.md`, so `next dev` leaves the user's `agents.md` untouched.)

## Stack

Next.js 16 (App Router, Turbopack, `output: "standalone"`) · React 19 · TypeScript · Tailwind CSS v4 (CSS-first config in `src/app/globals.css`) · Better Auth (email/password + `admin` plugin) · PostgreSQL 18 · Drizzle ORM · Zod 4 · Motion · Vitest · Playwright. No Python backend — Server Actions and Better Auth's route handler cover all server logic.

## Commands

Docker is the primary way to run and test (per `agents.md`). The host's Node may be older than what the toolchain needs; the images use Node 24.

```bash
docker compose up -d --build                           # db → migrate+seed (one-shot) → app on :3000
APP_PORT=3100 DB_PORT=5433 docker compose up -d        # if 3000/5432 are taken on this machine
docker compose --profile dev up dev                    # hot-reload dev server (source bind-mounted)
docker compose --profile test run --rm unit            # Vitest
docker compose --profile test run --rm --build e2e     # Playwright vs the production `app` container
docker compose --profile test run --rm e2e npx playwright test -g "rejecting"   # single e2e test
docker compose down -v                                 # stop and wipe the database
```

On the host (needs Node ≥ 20.19 and `docker compose up -d db`, with `DATABASE_URL` etc. from `.env.example`):

```bash
npm run dev | build | lint | typecheck                # typecheck = next typegen && tsc --noEmit
npm test -- src/lib/validations.test.ts -t "slot"      # single unit test
npm run db:generate                                    # after editing src/lib/db/schema.ts → new SQL in drizzle/
npm run db:migrate && npm run db:seed                  # seed is idempotent; first admin comes from ADMIN_* env
```

Default admin (compose defaults): `admin@bajrang.academy` / `Admin@12345`.

## Architecture

**Membership model.** `user.status` (`pending | active | inactive`) is separate from Better Auth's `role` (`user | admin`). Sign-up always creates `pending` (`status` is declared `input: false` in `auth.ts`, so clients can't set it). The admin inbox approves (→ `active`) or rejects (→ `inactive`). Inactive users can still log in to see their status. That's why this deliberately does **not** use the admin plugin's ban feature, which blocks login. Promoting someone to admin also sets them `active`. Deactivating or rejecting an admin also resets their role to `user`, because Better Auth's own `/api/auth/admin/*` endpoints look only at the role. `isAdmin()` in the DAL requires both `role === "admin"` and `status === "active"`. Admins can't deactivate or demote themselves.

**Schema is declared twice and must stay in sync.** Every column on `user` in `src/lib/db/schema.ts` that the app reads from the session must also appear in `user.additionalFields` in `src/lib/auth.ts`. Otherwise it's missing from `session.user` types. The Drizzle adapter maps by JS property name. `auth-client.ts` uses `inferAdditionalFields<typeof auth>()` so the client sees the same fields. Sign-up extras (phone, DOB, skill level) are re-validated server-side in a `databaseHooks.user.create.before` hook using `registrationExtrasSchema`.

**Authorization layers.**
- `src/proxy.ts` (Next 16's replacement for middleware) only checks for a session cookie and redirects to `/login?next=…`.
- Real checks live in `src/lib/dal.ts`: `getSession` (React-`cache`d), `requireUser`, `requireAdmin`. Every admin page *and* every Server Action in `src/app/admin/actions.ts` calls `requireAdmin()` itself, because Server Actions are public endpoints.
- Arguments bound from the client (`action.bind(null, id)`) are re-validated with Zod inside the action.

**Mutations.** Admin writes are Server Actions returning `ActionState` (`src/lib/action-state.ts`). They call `revalidatePath("/", "layout")` afterwards. Client wrappers:
- `ActionButton` for one-click bound actions, with toasts and an optional confirm click.
- `AdminForm` for forms, via `useActionState`. It submits through `onSubmit` + `startTransition` rather than the `action` prop, so React 19 doesn't reset inputs when validation fails.

Per-entity forms are in `components/admin/forms.tsx`, and their list/edit UIs in `components/admin/managers.tsx`. Those are client components because they take render-function props, which Server Components can't pass.

**Public content** (`site_settings` single row with `id = 1`, `coaches`, `training_slots`, `programs`, `announcements`) is read through `src/lib/content.ts`. It calls `connection()`, so pages render per request, admin edits appear immediately, and `next build` never touches the database. Cache Components is not enabled.

**Client/server boundary.** Shared enums live in dependency-free `src/lib/constants.ts`. Client code must import from there, not from `db/schema.ts`, which would pull Drizzle into the bundle. `schema.ts` imports it relatively because drizzle-kit loads that file without the `@/` alias.

**Docker.** A multi-stage `Dockerfile` with the following targets:
- `tools` — full source and dev deps; used by the migrate, dev and unit services.
- `runner` — the standalone server, non-root. Its healthcheck hits `/api/auth/ok`.

`e2e/Dockerfile` is the Playwright image and must match the `@playwright/test` version. The e2e container reaches the app at `http://academy-web:3000` (a network alias — Chromium force-upgrades `http://app:…` to HTTPS because `.app` is an HSTS-preloaded TLD), so that origin is listed in `BETTER_AUTH_TRUSTED_ORIGINS`.

## Gotchas

- lucide-react v1 has no brand icons; social icons are inline SVGs in `components/brand/social-icons.tsx`.
- Zod 4: use `z.flattenError(err)` rather than `err.flatten()`, and `{ error: "…" }` for messages.
- `revalidateTag` requires a second (cacheLife) argument in Next 16.
