#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."
if [[ -e .env.production ]]; then
  echo ".env.production already exists; leaving it unchanged."
  exit 0
fi

STORE_DOMAIN=${STORE_DOMAIN:-vikipat.com}
ADMIN_DOMAIN=${ADMIN_DOMAIN:-dash.vikipat.com}
ADMIN_EMAIL=${ADMIN_EMAIL:-hello@vikipat.com}
ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
JWT_SECRET=$(openssl rand -hex 64)
POSTGRES_PASSWORD=$(openssl rand -hex 32)

umask 077
{
  printf 'STORE_DOMAIN=%s\n' "$STORE_DOMAIN"
  printf 'ADMIN_DOMAIN=%s\n' "$ADMIN_DOMAIN"
  printf 'ADMIN_EMAIL=%s\n' "$ADMIN_EMAIL"
  printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
  printf 'JWT_SECRET=%s\n' "$JWT_SECRET"
  printf 'POSTGRES_USER=vikipat\n'
  printf 'POSTGRES_PASSWORD=%s\n' "$POSTGRES_PASSWORD"
  printf 'POSTGRES_DB=vikipat\n'
} > .env.production
chown --reference=. .env.production

echo "Production environment created with mode 600."
echo "Initial admin email: ${ADMIN_EMAIL}"
echo "Initial admin password: ${ADMIN_PASSWORD}"
echo "Save that password now. The admin app requires you to change it at first login."
