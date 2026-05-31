#!/usr/bin/env bash
set -Eeuo pipefail
PORT="${PORT:-8088}"
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared não encontrado. Tentando instalar..."
  TMP="/tmp/cloudflared-linux-amd64.deb"
  curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb" -o "$TMP"
  dpkg -i "$TMP" || apt-get install -f -y
fi
echo "Abrindo túnel mundial para http://localhost:${PORT}"
echo "Copie a URL https://...trycloudflare.com exibida abaixo."
cloudflared tunnel --url "http://localhost:${PORT}"
