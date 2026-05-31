#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
./stop.sh || true
sleep 1
./start.sh
