#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8088}"
echo "== Big Server status =="
if command -v pm2 >/dev/null 2>&1; then pm2 status big-server || true; fi
if [ -f logs/big-server.pid ]; then echo "PID fallback: $(cat logs/big-server.pid)"; fi
if command -v curl >/dev/null 2>&1; then
  echo
  curl -s "http://127.0.0.1:${PORT}/health" | jq . 2>/dev/null || curl -s "http://127.0.0.1:${PORT}/health" || true
fi
if command -v lsof >/dev/null 2>&1; then
  echo
  lsof -iTCP:"$PORT" -sTCP:LISTEN || true
fi
