#!/usr/bin/env bash
#
# Archives the hike data volume. Run from anywhere; intended for cron.
#
#   ./deploy/backup.sh
#   BACKUP_DIR=/mnt/backups RETENTION_DAYS=90 ./deploy/backup.sh
#
set -euo pipefail

project="${COMPOSE_PROJECT_NAME:-dirndltrails}"
volume="${DATA_VOLUME:-${project}_data}"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${BACKUP_DIR:-${root_dir}/backups}"
retention_days="${RETENTION_DAYS:-30}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if ! docker volume inspect "$volume" >/dev/null 2>&1; then
  echo "volume '$volume' not found; set DATA_VOLUME to the right name" >&2
  exit 1
fi

mkdir -p "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="dirndltrails-${stamp}.tar.gz"

docker run --rm \
  -v "${volume}:/data:ro" \
  -v "${backup_dir}:/backup" \
  alpine:3.20 \
  tar czf "/backup/${archive}" \
    --exclude='./.store.lock*' \
    --exclude='./quarantine/*.tmp' \
    -C /data .

find "$backup_dir" -name 'dirndltrails-*.tar.gz' -mtime "+${retention_days}" -delete

echo "Wrote ${backup_dir}/${archive}"
