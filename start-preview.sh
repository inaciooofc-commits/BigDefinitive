#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"
export PORT="${PORT:-8088}"
export HOST="${HOST:-0.0.0.0}"
export DATA_DIR="${DATA_DIR:-$(pwd)/data}"
export LOG_DIR="${LOG_DIR:-$(pwd)/logs}"
mkdir -p "$DATA_DIR" "$LOG_DIR"

echo "Big Server Preview — backend real, sem cluster"
echo "App principal: http://localhost:$PORT/member-app/"
echo "Painel admin : http://localhost:$PORT/admin-app/"
echo "Health      : http://localhost:$PORT/health"
echo "Pressione CTRL+C para parar."
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: Node.js não está instalado. Instale com: sudo apt install nodejs npm -y"
  exit 1
fi
if [ ! -d node_modules ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "ERRO: npm não está instalado. Instale com: sudo apt install npm -y"
    exit 1
  fi
  npm install --omit=dev
fi

exec node server.js
