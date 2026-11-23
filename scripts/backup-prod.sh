#!/bin/bash
# Sauvegarde PostgreSQL de production AirGap.
# À installer sur le serveur (ex. /usr/local/sbin/airgap-backup) et appeler
# depuis cron avec l'utilisateur deploy.
set -euo pipefail

APP_DIR="${APP_DIR:-/app}"
BACKUP_DIR="$APP_DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/airgap-$STAMP.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

exec 9>/tmp/airgap-backup.lock
flock -n 9 || exit 0

cd "$APP_DIR"
docker compose -f docker-compose.prod.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' </dev/null \
  | gzip > "$BACKUP_FILE"

test -s "$BACKUP_FILE"
gzip -t "$BACKUP_FILE"
find "$BACKUP_DIR" -type f -name 'airgap-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "$(date -Is) backup ok: $(basename "$BACKUP_FILE") ($(du -h "$BACKUP_FILE" | cut -f1))" \
  >> "$BACKUP_DIR/backup.log"
