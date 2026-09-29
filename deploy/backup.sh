#!/bin/sh
# shellcheck shell=busybox
# (Runs in the postgres:*-alpine image under BusyBox ash, which supports pipefail.)
# Nightly Postgres backup, run by the `backup` service in docker-compose.prod.yml.
#   - Writes /backups/bajrang-YYYY-MM-DD.sql.gz once a day after BACKUP_HOUR (IST).
#   - Deletes local dumps older than BACKUP_KEEP_DAYS.
#   - If BACKUP_UPLOAD_URL (an Oracle Object Storage PAR URL ending in /o/) is set,
#     uploads each dump there as well.
# Restart-safe: it checks for today's file rather than relying on a timer.
#   Run one immediately:  docker compose -f docker-compose.prod.yml exec backup sh /backup.sh now
set -eu
set -o pipefail

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_HOUR="${BACKUP_HOUR:-2}"
IST="IST-5:30" # POSIX TZ: UTC+5:30, works without tzdata

command -v curl >/dev/null 2>&1 || apk add --no-cache curl >/dev/null

backup() {
  day="$(TZ=$IST date +%Y-%m-%d)"
  file="/backups/bajrang-$day.sql.gz"
  # Write to a temp name and rename, so a failed dump never looks like a good one.
  pg_dump --no-owner --clean --if-exists | gzip -9 > "$file.partial"
  mv "$file.partial" "$file"
  echo "[backup] wrote $file ($(du -h "$file" | cut -f1))"

  if [ -n "${BACKUP_UPLOAD_URL:-}" ]; then
    if curl -fsS --retry 3 -T "$file" "${BACKUP_UPLOAD_URL%/}/$(basename "$file")"; then
      echo "[backup] uploaded to object storage"
    else
      echo "[backup] WARNING: upload failed; the local copy is kept" >&2
    fi
  fi

  find /backups -name 'bajrang-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
}

if [ "${1:-}" = "now" ]; then
  backup
  exit 0
fi

echo "[backup] scheduler started: daily after ${BACKUP_HOUR}:00 IST, keeping ${KEEP_DAYS} days"
while true; do
  day="$(TZ=$IST date +%Y-%m-%d)"
  hour="$(TZ=$IST date +%H)"
  if [ ! -f "/backups/bajrang-$day.sql.gz" ] && [ "${hour#0}" -ge "$BACKUP_HOUR" ]; then
    backup || { echo "[backup] FAILED — will retry in 15 minutes" >&2; rm -f /backups/*.partial; }
  fi
  sleep 900
done
