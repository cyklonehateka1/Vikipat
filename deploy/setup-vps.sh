#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

DEPLOY_USER=${DEPLOY_USER:-deploy}
APP_DIR=${APP_DIR:-/opt/vikipat}
BACKUP_DIR=${BACKUP_DIR:-/opt/vikipat-backups}

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades rsync openssl

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
ARCH=$(dpkg --print-architecture)
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker fail2ban unattended-upgrades

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0750 "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0750 "$BACKUP_DIR"
cat > /etc/cron.d/vikipat-backup <<EOF
17 2 * * * ${DEPLOY_USER} APP_DIR=${APP_DIR} BACKUP_DIR=${BACKUP_DIR} ${APP_DIR}/deploy/backup.sh >> /var/log/vikipat-backup.log 2>&1
EOF
chmod 0644 /etc/cron.d/vikipat-backup

KEY_SOURCE=""
if [[ -n ${SSH_PUBLIC_KEY:-} ]]; then
  KEY_SOURCE=/tmp/vikipat-deploy-key
  printf '%s\n' "$SSH_PUBLIC_KEY" > "$KEY_SOURCE"
elif [[ -s /root/.ssh/authorized_keys ]]; then
  KEY_SOURCE=/root/.ssh/authorized_keys
fi

if [[ -n "$KEY_SOURCE" ]]; then
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "/home/${DEPLOY_USER}/.ssh"
  install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0600 "$KEY_SOURCE" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  [[ "$KEY_SOURCE" == /tmp/* ]] && rm -f "$KEY_SOURCE"
  echo "SSH key copied to the deploy user."
else
  echo "No SSH public key found; root password access remains available." >&2
fi

# Root password login is intentionally retained for this deployment.
cat > /etc/ssh/sshd_config.d/99-vikipat.conf <<'EOF'
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
EOF
sshd -t
systemctl reload ssh

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "VPS setup complete. Reconnect as ${DEPLOY_USER}."
