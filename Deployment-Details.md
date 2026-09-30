# Deployment Details — how the deployment was built

This document explains **what was created for deploying the Bajrang Badminton Academy app**: every file, what it does, the commands inside it, and how each piece was tested.

For the **step-by-step instructions to deploy on your server**, see **`Guide.md`**.

---

## 1. Overview

```
Developer ──git push──► GitHub ──► GitHub Actions (.github/workflows/ci-deploy.yml)
                                     1. checks : npm ci · lint · typecheck · unit tests
                                     2. e2e    : full app in Docker + Playwright browser tests
                                     3. deploy : ssh VM → bash ~/bajrang/deploy/deploy.sh <commit>
                                                          │
Server (VM) ─────────────────────────────────────────────┘
   docker compose -f docker-compose.prod.yml
     ├─ db       PostgreSQL 18            (data in Docker volume "pgdata")
     ├─ migrate  one-shot: migrations + seed, runs on every deploy
     ├─ app      Next.js production server (port 3000, loopback only)
     ├─ tunnel   cloudflared → Cloudflare edge → https://app.sksap.com
     └─ backup   nightly pg_dump → ./backups (+ optional off-site upload)
```

**Design choices:**

| Decision | Reason |
|---|---|
| **Cloudflare Tunnel** instead of opening ports 80/443 | The VM needs no inbound web ports. HTTPS certificates and DDoS protection come from Cloudflare, free. |
| **Build the Docker image on the server** | Works on any CPU architecture (x86 or ARM) and needs no image registry. GitHub only runs the tests. |
| **Deploy the exact tested commit** (`github.sha`) | What goes live is exactly what passed the tests. |
| **Migrations run as a separate one-shot container** | The app only starts once the database schema is up to date. |
| **Photos stored inside Postgres** | A single database backup contains everything: data and uploaded images. |

---

## 2. Files created for deployment

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage image build: dependencies, tools (migrations/tests), build, and a small production runner |
| `docker-compose.yml` | **Local development / testing** stack: db, migrate, app, plus `dev`, `unit` and `e2e` profiles |
| `docker-compose.prod.yml` | **Production** stack: db, migrate, app, tunnel, backup |
| `.env.production.example` | Template for the server's secret settings (`.env`) |
| `deploy/setup-server.sh` | One-time server preparation: packages, Docker, GitHub deploy key, clone |
| `deploy/deploy.sh` | Deploys a given commit: fetch, build, start, health check |
| `deploy/backup.sh` | Nightly database backup with retention and optional upload |
| `.github/workflows/ci-deploy.yml` | GitHub Actions pipeline: test, then deploy |
| `e2e/Dockerfile`, `playwright.config.ts`, `e2e/academy.spec.ts` | Browser end-to-end tests, run in Docker |
| `.gitattributes` | Forces Linux (LF) line endings for `*.sh`, so scripts written on Windows run on the server |
| `.gitignore` (updated) | Keeps `.env`, `backups/` and test artifacts out of git; allows the two `.env*.example` templates |
| `Guide.md` | Step-by-step deployment instructions for your VM |
| `DEPLOY.md` | The same pipeline described for an Oracle Cloud ARM VM (alternative host) |
| `Deployment-Details.md` | This document |

**Application code changes made for production:**

| File | Change |
|---|---|
| `next.config.ts` | `output: "standalone"`: Next.js emits a self-contained server (`server.js`), so the runtime image doesn't need all of `node_modules`. `serverActions.bodySizeLimit: "3mb"` for photo uploads. |
| `src/lib/auth.ts` | Reads `CLIENT_IP_HEADER`. Production sets it to `cf-connecting-ip`, so login rate-limiting uses each visitor's real IP (Cloudflare's header) instead of the tunnel's IP. |
| `src/lib/auth.ts` | `BETTER_AUTH_TRUSTED_ORIGINS` from the environment (set to `PUBLIC_URL`). |
| `src/instrumentation.ts` | Starts the 15-minute membership-expiry timer when the server boots. |

---

## 3. `Dockerfile` — how the image is built

Stages (each builds on the previous one where noted):

| Stage | Based on | What it does | Used by |
|---|---|---|---|
| `base` | `node:24-alpine` | Sets the work dir and disables telemetry | all stages |
| `deps` | `base` | `npm ci`: installs exactly the versions in `package-lock.json` | `tools` |
| `tools` | `base` | Copies `node_modules` and the full source | `migrate` service, unit tests, dev server |
| `builder` | `tools` | `npm run build`, i.e. `next build` | `runner` |
| `runner` | `base` | Copies only the standalone build, runs as non-root user `nextjs` | `app` service |

Key commands inside:

```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci          # reproducible install with a download cache
RUN BETTER_AUTH_SECRET=build-time-placeholder-never-used-at-runtime npm run build
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
USER nextjs                                               # the app never runs as root
HEALTHCHECK … CMD wget -qO- http://127.0.0.1:3000/api/auth/ok || exit 1
CMD ["node", "server.js"]
```

**About the build-time secret:** `next build` loads the auth module, and Better Auth refuses to initialise in production without a secret. The placeholder exists only inside that one `RUN` step. The final image never contains it, and at runtime the real secret comes from `.env`.

---

## 4. `docker-compose.prod.yml` — the production stack

| Service | Image | Restart | Depends on | Notes |
|---|---|---|---|---|
| `db` | `postgres:18-alpine` | always | — | Data in volume `pgdata`; health check `pg_isready` |
| `migrate` | Dockerfile target `tools` | no (one-shot) | db healthy | Runs `npm run db:migrate && npm run db:seed` |
| `app` | Dockerfile target `runner` | always | migrate finished OK | Published only on `127.0.0.1:3000` (loopback) |
| `tunnel` | `cloudflare/cloudflared:2026.9.3` | always | app healthy | Runs `tunnel --no-autoupdate run` with `TUNNEL_TOKEN` |
| `backup` | `postgres:18-alpine` | always | migrate finished OK | Runs `deploy/backup.sh`; writes to `./backups` |

**Required settings:** `${VAR:?message}` makes Compose refuse to start when a secret is missing, instead of starting with empty values:

```yaml
BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?set BETTER_AUTH_SECRET in .env}
TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN:?set CLOUDFLARE_TUNNEL_TOKEN in .env}
```

**Startup order** is enforced with health checks:

```
db (healthy) → migrate (exits 0) → app (healthy) → tunnel
                                 → backup
```

The backup waits for `migrate` so that, on a new server, the first dump already contains the tables.

Useful commands (run in `~/bajrang` on the server):

```bash
docker compose -f docker-compose.prod.yml config -q         # validate the file + .env (prints errors only)
docker compose -f docker-compose.prod.yml up -d --build     # build and start everything
docker compose -f docker-compose.prod.yml ps                # status / health
docker compose -f docker-compose.prod.yml logs -f app       # follow logs (app | tunnel | db | migrate | backup)
docker compose -f docker-compose.prod.yml restart app       # restart one service
docker compose -f docker-compose.prod.yml down              # stop (keeps the database volume)
```

> ⚠️ `docker compose … down -v` **deletes the database volume**. Never use `-v` in production unless you mean to wipe all data.

---

## 5. `.env.production.example` — server settings

Copied to `.env` on the server (`chmod 600`, never committed):

| Variable | Meaning | How to generate |
|---|---|---|
| `PUBLIC_URL` | Public address, e.g. `https://app.sksap.com`; used for auth cookies and trusted origins | — |
| `POSTGRES_USER`, `POSTGRES_DB` | Database user and name (default `bajrang`) | — |
| `POSTGRES_PASSWORD` | Database password | `openssl rand -hex 24` |
| `BETTER_AUTH_SECRET` | Signs login sessions | `openssl rand -base64 32` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | First admin, created by the seed on the first deploy only | — |
| `CLOUDFLARE_TUNNEL_TOKEN` | Connects cloudflared to your tunnel | Cloudflare Zero Trust → Tunnels |
| `BACKUP_KEEP_DAYS` | Days of local backups to keep (default 14) | — |
| `BACKUP_UPLOAD_URL` | Optional HTTP `PUT` URL for off-site backups | e.g. Oracle Object Storage PAR |

---

## 6. `deploy/setup-server.sh` — one-time server preparation

**Usage (on the server):**

```bash
bash setup-server.sh git@github.com:esskay01/academy.git
```

What it runs, in order:

```bash
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y git curl ca-certificates unattended-upgrades   # unattended-upgrades = automatic security patches

curl -fsSL https://get.docker.com | sudo sh        # Docker Engine + Compose plugin (skipped if Docker exists)
sudo usermod -aG docker "$USER"                     # run docker without sudo (after re-login)
sudo systemctl enable --now docker                  # start Docker now and on every boot

ssh-keygen -t ed25519 -N "" -C "bajrang-vm-deploy" -f ~/.ssh/github_deploy   # read-only GitHub deploy key
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts                    # trust GitHub's host key
cat ~/.ssh/github_deploy.pub                        # printed for you to add in GitHub → Deploy keys
read -r -p "Press Enter once the deploy key is added... "

git clone "$REPO_URL" "$HOME/bajrang"
chmod +x "$HOME/bajrang/deploy/"*.sh
mkdir -p "$HOME/bajrang/backups"
```

- **Safe to re-run:** it skips Docker installation, key creation and cloning if they already exist.
- **Cross-platform:** the header comment mentions Oracle ARM, but every command works the same on x86-64 Ubuntu 24.04.

---

## 7. `deploy/deploy.sh` — deploying a commit

**Usage (on the server, or called by GitHub Actions over SSH):**

```bash
bash ~/bajrang/deploy/deploy.sh <commit-sha | origin/main>
```

Steps and commands:

```bash
[ -f .env ] || exit 1                                    # refuse to deploy without settings
git fetch --prune origin                                 # get the latest commits from GitHub
git checkout --force --detach "$REF"                     # switch to the exact commit to deploy
docker compose -f docker-compose.prod.yml build          # build new images (the old version keeps serving)
docker compose -f docker-compose.prod.yml up -d --remove-orphans   # recreate changed containers; runs migrate first
docker inspect -f '{{.State.Health.Status}}' <app>       # poll up to 5 minutes until "healthy"
docker compose -f docker-compose.prod.yml logs --tail 80 migrate app   # printed only if it isn't healthy
curl -fsS -o /dev/null http://127.0.0.1:3000/api/auth/ok # final local check
docker image prune -f                                    # remove old, unused images
```

Details that make it safe:
- **`set -euo pipefail`:** any failing command stops the deploy immediately.
- **Everything inside `main()`:** `git checkout` can replace `deploy.sh` itself while it's running. Wrapping the body in a function makes bash read the whole script before running any of it.
- **Short downtime:** the build happens *before* containers are swapped, so downtime is only the few seconds the app takes to restart.
- **Rollback:** run `deploy.sh <older-sha>`. Code rolls back; database migrations don't, so restore a backup if needed.

---

## 8. `deploy/backup.sh` — nightly backups

It runs permanently inside the `backup` container. Every 15 minutes it checks whether today's backup exists and it's past 02:00 IST. If not, it runs:

```sh
pg_dump --no-owner --clean --if-exists | gzip -9 > "$file.partial"   # dump + compress
mv "$file.partial" "$file"                                            # rename only after success
curl -fsS --retry 3 -T "$file" "${BACKUP_UPLOAD_URL%/}/$(basename "$file")"   # optional off-site copy
find /backups -name 'bajrang-*.sql.gz' -mtime +"$KEEP_DAYS" -delete   # retention
```

- **Output:** `~/bajrang/backups/bajrang-YYYY-MM-DD.sql.gz`.
- **Temporary name first:** a failed dump never looks like a good backup.
- **Restart-safe:** it checks for today's file rather than using a timer, so restarts don't cause missed or duplicate backups.
- **India time without tzdata:** it uses the POSIX time zone `IST-5:30` (UTC+5:30), which works in the minimal Alpine image.

Commands:

```bash
docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now       # take a backup immediately
gunzip -c backups/bajrang-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U bajrang -d bajrang   # restore (replaces data)
```

---

## 9. `.github/workflows/ci-deploy.yml` — the pipeline

**Triggers:** every push to `main`, every pull request (tests only), and manual runs (**Actions → Run workflow**).

| Job | Runs on | Commands | Needs |
|---|---|---|---|
| `checks` | `ubuntu-24.04`, Node 24 | `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` | — |
| `e2e` | `ubuntu-24.04` | `docker compose -p ci --profile test run --rm --build e2e`, then `docker compose -p ci --profile test down -v` | `checks` |
| `deploy` | `ubuntu-24.04`, environment `production` | SSH to the VM → `bash ~/bajrang/deploy/deploy.sh ${{ github.sha }}`, then `curl https://app.sksap.com/api/auth/ok` | `checks` and `e2e`; `main` only |

The deploy step's commands:

```bash
install -m 700 -d ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/deploy_key && chmod 600 ~/.ssh/deploy_key
printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes "$SSH_USER@$SSH_HOST" \
  "bash ~/bajrang/deploy/deploy.sh ${{ github.sha }}"
```

**Required GitHub secrets:** `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.

**Safety features:**
- `permissions: contents: read`, so the workflow can't modify the repository.
- `StrictHostKeyChecking=yes` plus a pinned `known_hosts`, so it refuses to connect to an impostor server.
- `concurrency: production` with `cancel-in-progress: false`, so two deploys never overlap; a newer one waits.
- On e2e failure, the Playwright report is uploaded as an artifact, kept for 7 days.

---

## 10. How the deployment was tested (commands used)

Everything was verified locally with Docker before handing over.

**Code quality:**

```bash
npx eslint                          # lint
npx tsc --noEmit                    # type-check
docker compose --profile test run --rm unit      # 21 unit tests (Vitest)
```

**Full end-to-end suite in an isolated stack** (a separate project name gives it its own throwaway database, so the local site isn't polluted):

```bash
export APP_PORT=3200 DB_PORT=5434
docker compose -p bajrang-e2e --profile test run --rm --build e2e    # all Playwright tests
docker compose -p bajrang-e2e --profile test down -v                 # discard the test database
```

**Production stack started locally** with test secrets and a dummy tunnel token:

```bash
docker compose -p bajrang-prodtest -f docker-compose.prod.yml --env-file prodtest.env up -d --build
docker compose -p bajrang-prodtest -f docker-compose.prod.yml --env-file /dev/null config -q
#   → "required variable POSTGRES_PASSWORD is missing a value" (missing secrets are refused ✔)
```

**Per-visitor login rate-limiting via `CF-Connecting-IP`:**

```bash
curl -X POST http://127.0.0.1:3300/api/auth/sign-in/email -H 'cf-connecting-ip: 203.0.113.10' …   # ×6
#   → 401 401 401 429 429 429   (visitor A blocked after 3 bad attempts)
curl … -H 'cf-connecting-ip: 198.51.100.7'   → 401   (visitor B unaffected ✔)
curl … correct password                      → 200   (seeded admin can log in ✔)
```

**Backup and restore round-trip:**

```bash
docker compose … exec backup sh /backup.sh now
createdb restore_check && gunzip -c backups/<file> | psql -d restore_check
#   bajrang:       1 users, 3 coaches, 3 testimonials, 3 migrations
#   restore_check: 1 users, 3 coaches, 3 testimonials, 3 migrations   (identical ✔)
```

**Pipeline and script linting:**

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -no-color       # workflow ✔
docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable \
  deploy/deploy.sh deploy/setup-server.sh deploy/backup.sh                        # scripts ✔
```

**Image availability for both CPU types:**

```bash
docker manifest inspect cloudflare/cloudflared:2026.9.3   # amd64 + arm64
docker manifest inspect postgres:18-alpine                # amd64 + arm64
docker manifest inspect node:24-alpine                    # amd64 + arm64
```

**Problems found and fixed during these tests:**

| Problem found | Root cause | Fix |
|---|---|---|
| First backup on a new server was empty (373 bytes) | The backup ran before migrations had created the tables | `backup` now waits for `migrate` to complete |
| Login rate-limit could be per-tunnel instead of per-visitor | Better Auth ignores `X-Forwarded-For` when it lists several IPs (normal behind a proxy) | Production uses Cloudflare's `CF-Connecting-IP` |
| Misleading "default secret" errors during `next build` | The build loads the auth module in production mode | Build-only placeholder secret in the `builder` stage |
| Scripts edited on Windows could fail on Linux | CRLF line endings | `.gitattributes`: `*.sh text eol=lf` |
| `deploy.sh` updating itself mid-run | `git checkout` replaces the running file | The body runs inside `main()` |

---

## 11. Quick command reference

| Where | Command | What it does |
|---|---|---|
| PC | `git push origin main` | Triggers tests, then deployment |
| Server | `bash ~/bajrang/deploy/deploy.sh origin/main` | Manual deploy of the latest `main` |
| Server | `bash ~/bajrang/deploy/deploy.sh <sha>` | Deploy or roll back to a specific commit |
| Server | `docker compose -f docker-compose.prod.yml ps` | Service status |
| Server | `docker compose -f docker-compose.prod.yml logs -f app` | Live app logs |
| Server | `docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now` | Backup now |
| Server | `docker compose -f docker-compose.prod.yml exec db psql -U bajrang` | Database console |
| PC | `docker compose up -d --build` | Run the app locally |
| PC | `docker compose -p bajrang-e2e --profile test run --rm --build e2e` | Run all e2e tests locally |
