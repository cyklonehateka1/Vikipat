#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR=${APP_DIR:-/opt/vikipat}
BACKUP_DIR=${BACKUP_DIR:-/opt/vikipat-backups}
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DATABASE_BACKUP="${BACKUP_DIR}/postgres-${STAMP}.sql.gz"
UPLOAD_BACKUP="${BACKUP_DIR}/uploads-${STAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"
set -a
# shellcheck disable=SC1091
source .env.production
set +a

docker compose --env-file .env.production exec -T postgres \
  pg_dump --clean --if-exists --no-owner --username "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 > "$DATABASE_BACKUP"

docker run --rm \
  -v vikipat_gh_api_uploads:/uploads:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3.22 tar -czf "/backup/uploads-${STAMP}.tar.gz" -C /uploads .

find "$BACKUP_DIR" -type f \( -name 'postgres-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime "+${KEEP_DAYS}" -delete
echo "Backups created: ${DATABASE_BACKUP} and ${UPLOAD_BACKUP}"
