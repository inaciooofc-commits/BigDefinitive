# Google Sheets já configurado localmente

Este pacote já contém:

- `credentials/google-service-account.json`
- `.env` com `GOOGLE_SHEETS_ENABLED=true`
- `GOOGLE_OWNER_EMAIL=inaciooofc@gmail.com`
- `GOOGLE_SERVICE_ACCOUNT_FILE=./credentials/google-service-account.json`

O campo `GOOGLE_SHEETS_ID` começa vazio de propósito. Ao executar o bootstrap, o Big cria a planilha automaticamente, cria todas as abas e grava o ID final em:

- `.env`
- `data/config.json`
- `data/sheets-sync.json`

## Rodar no antiX

```bash
cd /opt/big-server
./setup-sheets-local.sh
```

Ou manualmente:

```bash
cd /opt/big-server
npm install
node scripts/sheets-bootstrap.js
```

## Segurança

Não suba este pacote com `credentials/` e `.env` para GitHub público. A credencial deve ficar só no servidor antiX.
