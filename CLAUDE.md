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
# E2E: run as a SEPARATE compose project (-p) so tests get their own throwaway DB — the suite
# creates users/coaches/slots and would otherwise pollute the live site. Different host ports too.
export APP_PORT=3200 DB_PORT=5434
docker compose -p bajrang-e2e --profile test run --rm --build e2e                 # full suite
docker compose -p bajrang-e2e --profile test run --rm e2e npx playwright test -g "rejecting"   # single test
docker compose -p bajrang-e2e down -v                                            # discard test DB
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

**Public content** (`site_settings` single row with `id = 1`, `coaches`, `training_slots`, `programs`, `announcements`, `testimonials`, plus the 4 most recently approved non-admin members for the hero — exposed only as short name, photo, level and join date) is read through `src/lib/content.ts`. It calls `connection()`, so pages render per request, admin edits appear immediately, and `next build` never touches the database. Cache Components is not enabled.

**Client/server boundary.** Shared enums live in dependency-free `src/lib/constants.ts`. Client code must import from there, not from `db/schema.ts`, which would pull Drizzle into the bundle. `schema.ts` imports it relatively because drizzle-kit loads that file without the `@/` alias.

**Docker.** A multi-stage `Dockerfile` with the following targets:
- `tools` — full source and dev deps; used by the migrate, dev and unit services.
- `runner` — the standalone server, non-root. Its healthcheck hits `/api/auth/ok`.

`e2e/Dockerfile` is the Playwright image and must match the `@playwright/test` version. The e2e container reaches the app at `http://academy-web:3000` (a network alias — Chromium force-upgrades `http://app:…` to HTTPS because `.app` is an HSTS-preloaded TLD), so that origin is listed in `BETTER_AUTH_TRUSTED_ORIGINS`.

**Uploads.** Member and testimonial photos are stored in Postgres (`media` table, a `bytea` custom type because drizzle-orm 0.45 has none) and served by `src/app/media/[id]/route.ts` with immutable caching. Each upload gets a new id. `src/lib/media.ts` validates by magic bytes (JPEG, PNG or WebP, max 2 MB), not by the client MIME type. `serverActions.bodySizeLimit` is 3 MB for this. Replacing or removing a photo deletes the old `media` row.

**Phones.** Member mobile numbers are entered as 10 digits with a fixed `+91` prefix (`PhoneInput`) and stored as `+91XXXXXXXXXX`, also enforced in the sign-up hook. The academy's own contact phone in `site_settings` stays free-form.

**Memberships & payments** (`memberships` table, admin UI on `/admin/members/[id]`, member view on `/dashboard`). The date and payment rules live in pure `src/lib/membership.ts`, which is unit-tested:
- `end_date` = start + months + days − 1 (last day, inclusive), computed server-side only.
- "Today" is the India calendar date (`academyToday`).
- Payment status is derived from `fee` vs `amount_paid`, never stored.

Status follows memberships:
- `expireEndedMemberships()` (`src/lib/membership-server.ts`) marks non-admin members inactive once all their memberships have ended. It runs every 15 min from `src/instrumentation.ts`, after membership saves, and at the start of the dashboard and admin overview/members pages. Those pages call it themselves because a layout renders in parallel with its page.
- Saving a current or upcoming membership re-activates an *inactive* member (pending sign-ups are left alone).
- Manually activating a member whose memberships have all ended is refused.

Pages that run DB work before any request API must call `connection()` first. Otherwise `next build` tries to prerender them without a database; this broke the build once.

**Members admin.** The list is paginated (`?size=` must be a multiple of 10 from 10 to 100, default 50; `?page=`). Only `inactive` members can be permanently deleted. Sessions and accounts cascade. Below `md` the same `<table>` renders as stacked cards (cells label themselves via `data-label`), so e2e selectors work at every width.

**Passwords.** `PasswordInput` (show/hide, Caps Lock hint, optional strength meter from pure `src/lib/password.ts`). Members change their own password on `/dashboard#security` (`authClient.changePassword`, revoking other sessions). There is no email service, so "forgot password" means an admin resets it on the member's edit page (`resetMemberPassword` → `auth.api.setUserPassword` + `revokeUserSessions`). Admins can't reset other admins' passwords (account takeover); they change their own.

**Themes (light / dark / system).** Dark is the default. The preference lives in `localStorage` and is applied before paint by `themeBootScript` (`src/lib/theme.ts`) as `<html data-theme>`, so there is no flash; `ThemeToggle`/`useTheme` read those attributes. Light mode works by **redefining theme tokens** in `globals.css`, not by per-component classes:
- `white` is the *foreground* token (becomes near-black in light mode) — keep writing `text-white/60` etc.
- `canvas` = page background; `surface` = cards; `ink` stays dark in both themes (text on lime buttons/avatars).
- `brand` is the lime fill; use `text-brand-text` / `outline-brand-text` for brand-coloured text (deep lime in light mode), never `text-brand`.
- `.theme-dark` makes a subtree a dark "island" in either theme (the court game, badges on photos).
- Pale status text (`text-rose-300`, `text-amber-200`, …) and muted text (`text-white/35`–`/55`) are remapped by unlayered rules to pass WCAG AA; those rules exclude `:hover`/`:focus-visible` so state variants still win.
- `bg-chart` is the validated data-mark colour (meters, bars) in both themes.

**Admin overview** (`/admin`): registrations-per-week chart, fees collected/outstanding, renewals due in 7 days (a member's *latest* plan end, so renewed members drop off), batch occupancy meters. Date bucketing is pure and tested in `src/lib/analytics.ts`.

**Quality gates in e2e.** Besides feature flows, the suite runs axe (WCAG 2.1 AA) on key pages in both themes and checks that no page scrolls sideways at 360px and 768px. New UI must keep both green.

## Production

See `DEPLOY.md`: an Oracle Cloud ARM VM running `docker-compose.prod.yml`, published at https://app.sksap.com via Cloudflare Tunnel (no public web port).
- `.github/workflows/ci-deploy.yml` runs lint, typecheck, unit and e2e, then SSHes to the VM to run `deploy/deploy.sh <sha>`. The image is built **on the VM** (native ARM64).
- Production sets `CLIENT_IP_HEADER=cf-connecting-ip` so Better Auth rate-limits per real visitor. It's only safe because the app is unreachable except through Cloudflare.
- The `backup` service (`deploy/backup.sh`) dumps nightly after 02:00 IST and can upload to Object Storage. It depends on `migrate`, so the first dump on a fresh server has the schema.

## Gotchas

- Decorative oversized glows need `overflow-clip`, not `overflow-hidden`. "hidden" still creates a scroll container that a click or focus can shift sideways (the hero did).
- A 1×1 test image reports `naturalWidth` 0 through a `srcset` (width ÷ density), so e2e fixtures use 64×64.
- lucide-react v1 has no brand icons; social icons are inline SVGs in `components/brand/social-icons.tsx`.
- Zod 4: use `z.flattenError(err)` rather than `err.flatten()`, and `{ error: "…" }` for messages.
- `revalidateTag` requires a second (cacheLife) argument in Next 16.
- Don't animate above-the-fold content in with Motion `initial={{ opacity: 0 }}`: it's in the SSR HTML, so the content stays invisible until JS hydrates (hero LCP was 6 s on a throttled phone). Use the CSS `animate-rise` / `animate-word` / `animate-court-in` utilities with an inline `animationDelay`.
- `next/font` `subsets` only chooses what is *preloaded*; all subsets stay in the CSS. Preload `latin` only — `latin-ext` (₹, accents) loads on demand.
- A grid with no explicit columns sizes its implicit column to the widest content, so `truncate` text blows out the page on phones. Use `grid-cols-1` (= `minmax(0,1fr)`) and `minmax(0,…)` in custom templates.
- The theme reveal uses the View Transitions API; headless screenshots don't capture its frames faithfully (they can show a blank page). Verify it with `recordVideo` frames instead.
