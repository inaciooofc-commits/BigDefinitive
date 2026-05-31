#!/usr/bin/env bash
set -Eeuo pipefail
APP_NAME="Big Server"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="/opt/big-server"
PORT="${PORT:-8088}"
HOST="${HOST:-0.0.0.0}"
export DEBIAN_FRONTEND=noninteractive

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Execute como root: sudo ./install.sh"
  exit 1
fi

echo "==> Instalando ${APP_NAME} em ${TARGET}"
mkdir -p "$TARGET" /var/log/big-server

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y curl ca-certificates git nodejs npm jq dialog whiptail procps psmisc lsof net-tools unzip tar cron
fi

rsync -a --delete --exclude data --exclude logs "$SRC_DIR/" "$TARGET/" 2>/dev/null || {
  tar --exclude=data --exclude=logs -C "$SRC_DIR" -cf - . | tar -C "$TARGET" -xf -
}
mkdir -p "$TARGET/data" "$TARGET/logs" "$TARGET/credentials"
cd "$TARGET"
[ -f .env ] || cp .env.example .env 2>/dev/null || true

if [ -d node_modules ]; then
  npm install --omit=dev --prefer-offline || echo "Dependências locais presentes; continuando."
else
  npm install --omit=dev
fi
npm install -g pm2 >/dev/null 2>&1 || true
chmod +x start.sh stop.sh restart.sh status.sh big-menu.sh cloudflare-tunnel.sh backup.sh scripts/doctor.js scripts/sheets-bootstrap.js scripts/sheets-health.js scripts/backup.js || true
ln -sf "$TARGET/big-menu.sh" /usr/local/bin/big-menu
ln -sf "$TARGET/start.sh" /usr/local/bin/big-start
ln -sf "$TARGET/stop.sh" /usr/local/bin/big-stop
ln -sf "$TARGET/status.sh" /usr/local/bin/big-status
ln -sf "$TARGET/cloudflare-tunnel.sh" /usr/local/bin/big-tunnel

cat > /etc/init.d/big-server <<'INIT'
#!/bin/sh
### BEGIN INIT INFO
# Provides:          big-server
# Required-Start:    $remote_fs $network
# Required-Stop:     $remote_fs $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Big Server antiX
### END INIT INFO
case "$1" in
  start) /opt/big-server/start.sh ;;
  stop) /opt/big-server/stop.sh ;;
  restart) /opt/big-server/restart.sh ;;
  status) /opt/big-server/status.sh ;;
  *) echo "Uso: /etc/init.d/big-server {start|stop|restart|status}"; exit 1 ;;
esac
INIT
chmod +x /etc/init.d/big-server
if command -v update-rc.d >/dev/null 2>&1; then update-rc.d big-server defaults >/dev/null 2>&1 || true; fi
cat > /etc/cron.d/big-server <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
@reboot root cd /opt/big-server && PORT=${PORT} HOST=${HOST} /opt/big-server/start.sh >/var/log/big-server/cron-start.log 2>&1
CRON
chmod 644 /etc/cron.d/big-server
service cron start >/dev/null 2>&1 || /etc/init.d/cron start >/dev/null 2>&1 || true

node scripts/doctor.js
PORT="$PORT" HOST="$HOST" ./start.sh

echo
echo "Instalação concluída."
echo "App principal: http://localhost:${PORT}/member-app/"
echo "Painel admin : http://localhost:${PORT}/admin-app/"
echo "Admin inicial: clzin@big.x / clzin123"
echo "Menu: big-menu"
