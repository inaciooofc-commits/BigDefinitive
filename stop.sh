#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8088}"
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop big-server >/dev/null 2>&1 || true
  pm2 delete big-server >/dev/null 2>&1 || true
fi
if [ -f logs/big-server.pid ]; then
  PID="$(cat logs/big-server.pid)"
  kill "$PID" >/dev/null 2>&1 || true
  rm -f logs/big-server.pid
fi
pkill -f "$(pwd)/server.js" >/dev/null 2>&1 || true
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    echo "A porta $PORT ainda está ocupada por PID(s): $PIDS"
    echo "Para forçar: kill $PIDS"
  fi
fi
echo "Big Server parado."
