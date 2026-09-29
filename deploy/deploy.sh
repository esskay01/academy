#!/usr/bin/env bash
# Deploys a given commit on the VM. Called by GitHub Actions over SSH after all
# checks pass, or by hand:  ~/bajrang/deploy/deploy.sh [commit-sha|branch]
#
# Builds on the VM itself (native ARM64), applies migrations via the one-shot
# `migrate` service, and waits for the app health check before declaring success.
set -euo pipefail

# Everything lives in main(), which bash parses fully before running it: the
# git checkout below may replace this very file while the script is running.
main() {
  cd "$(dirname "$0")/.."
  REF="${1:-origin/main}"
  COMPOSE=(docker compose -f docker-compose.prod.yml)

  [ -f .env ] || { echo "Missing .env — copy .env.production.example and fill it in." >&2; exit 1; }

  echo "==> Fetching $REF"
  git fetch --prune origin
  git checkout --force --detach "$REF"
  echo "    now at $(git log -1 --format='%h %s')"

  echo "==> Building and starting (old version keeps serving during the build)"
  "${COMPOSE[@]}" build
  "${COMPOSE[@]}" up -d --remove-orphans

  echo "==> Waiting for the app to become healthy"
  app_id="$("${COMPOSE[@]}" ps -q app)"
  for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$app_id" 2>/dev/null || echo starting)"
    [ "$status" = "healthy" ] && break
    sleep 5
  done
  if [ "$status" != "healthy" ]; then
    echo "!! App did not become healthy (status: $status). Recent logs:" >&2
    "${COMPOSE[@]}" logs --tail 80 migrate app >&2
    exit 1
  fi

  curl -fsS -o /dev/null http://127.0.0.1:3000/api/auth/ok
  echo "==> Deployed $(git rev-parse --short HEAD) — healthy"
  docker image prune -f >/dev/null
}

main "$@"
exit
