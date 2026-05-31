#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f "credentials/google-service-account.json" ]; then
  echo "ERRO: credencial não encontrada em credentials/google-service-account.json"
  exit 1
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

if ! grep -q '^GOOGLE_SHEETS_ENABLED=' .env; then echo 'GOOGLE_SHEETS_ENABLED=true' >> .env; fi
if ! grep -q '^GOOGLE_OWNER_EMAIL=' .env; then echo 'GOOGLE_OWNER_EMAIL=inaciooofc@gmail.com' >> .env; fi
if ! grep -q '^GOOGLE_SERVICE_ACCOUNT_FILE=' .env; then echo 'GOOGLE_SERVICE_ACCOUNT_FILE=./credentials/google-service-account.json' >> .env; fi

sed -i 's/^GOOGLE_SHEETS_ENABLED=.*/GOOGLE_SHEETS_ENABLED=true/' .env
sed -i 's/^GOOGLE_OWNER_EMAIL=.*/GOOGLE_OWNER_EMAIL=inaciooofc@gmail.com/' .env
sed -i 's#^GOOGLE_SERVICE_ACCOUNT_FILE=.*#GOOGLE_SERVICE_ACCOUNT_FILE=./credentials/google-service-account.json#' .env

npm install
node scripts/sheets-bootstrap.js
