#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TARGET=${1:-deploy@169.58.217.73}
REMOTE_DIR=${REMOTE_DIR:-/opt/vikipat}

rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude '*/node_modules' \
  --exclude '*/dist' \
  --exclude '*.tsbuildinfo' \
  --exclude .env \
  --exclude .env.production \
  --exclude 'apps/api/data' \
  --exclude 'apps/api/uploads' \
  "$ROOT_DIR/" "${TARGET}:${REMOTE_DIR}/"

ssh "$TARGET" "chmod +x '${REMOTE_DIR}'/deploy/*.sh && '${REMOTE_DIR}/deploy/init-env.sh' && cd '${REMOTE_DIR}' && docker compose --env-file .env.production up -d --build --remove-orphans && docker compose --env-file .env.production ps"

echo "Storefront: https://vikipat.com"
echo "Admin: https://dash.vikipat.com"
