#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
OUT="${1:-$(pwd)/backups/big-backup-$(date +%Y%m%d-%H%M%S).tar.gz}"
mkdir -p "$(dirname "$OUT")"
tar -czf "$OUT" data logs package.json server.js member-app admin-app shared 2>/dev/null || tar -czf "$OUT" data logs
printf 'Backup criado: %s\n' "$OUT"
