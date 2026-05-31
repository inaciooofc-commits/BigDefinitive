#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
export PORT="${PORT:-8088}"
export HOST="${HOST:-0.0.0.0}"
export DATA_DIR="${DATA_DIR:-$(pwd)/data}"
export LOG_DIR="${LOG_DIR:-$(pwd)/logs}"
mkdir -p "$DATA_DIR" "$LOG_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "ERRO: Node.js não encontrado. Instale com: sudo apt install nodejs npm -y"
  exit 1
fi
if [ ! -d node_modules ] && command -v npm >/dev/null 2>&1; then
  npm install --omit=dev
fi

# Remove versões antigas que tenham ficado em cluster no PM2.
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete big-server >/dev/null 2>&1 || true
fi

# Evita porta presa por processo antigo.
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    echo "Porta $PORT ocupada por PID(s): $PIDS"
    if [ "${BIG_KILL_PORT:-0}" = "1" ]; then
      echo "BIG_KILL_PORT=1 ativo: encerrando processo(s) da porta $PORT..."
      kill $PIDS >/dev/null 2>&1 || true
      sleep 1
    else
      echo "Pare o processo antigo com: BIG_KILL_PORT=1 ./start.sh"
      echo "Ou use outra porta: PORT=8090 ./start.sh"
      exit 1
    fi
  fi
fi

if [ "${BIG_NO_PM2:-0}" != "1" ] && command -v pm2 >/dev/null 2>&1; then
  pm2 start ecosystem.config.cjs --only big-server --update-env >/dev/null
  pm2 save >/dev/null 2>&1 || true
  pm2 status big-server
else
  if [ -f "$LOG_DIR/big-server.pid" ] && kill -0 "$(cat "$LOG_DIR/big-server.pid")" 2>/dev/null; then
    echo "Big Server já está rodando: PID $(cat "$LOG_DIR/big-server.pid")"
  else
    nohup node server.js >> "$LOG_DIR/server.log" 2>&1 &
    echo $! > "$LOG_DIR/big-server.pid"
    echo "Big Server iniciado em modo simples/fork: PID $(cat "$LOG_DIR/big-server.pid")"
  fi
fi

printf '\nModo: fork/simples, sem cluster\nApp principal: http://localhost:%s/member-app/\nPainel admin : http://localhost:%s/admin-app/\nHealth      : http://localhost:%s/health\n' "$PORT" "$PORT" "$PORT"
