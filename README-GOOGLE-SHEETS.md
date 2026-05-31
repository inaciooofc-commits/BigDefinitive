# Google Sheets no Big

O Google Sheets é usado como central de organização, exportação, importação controlada e mapa do sistema.

Ele **não** é o banco principal e **não** deve guardar dados sensíveis.

## Links necessários

- Criar projeto: https://console.cloud.google.com/projectcreate
- Ativar Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com
- Ativar Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com
- Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts
- Credentials: https://console.cloud.google.com/apis/credentials
- Criar Google Sheet manual: https://docs.google.com/spreadsheets/create

## O que fazer

1. Criar projeto no Google Cloud.
2. Ativar Google Sheets API.
3. Ativar Google Drive API.
4. Criar Service Account.
5. Gerar chave JSON.
6. Colocar a chave em:

```bash
/opt/big-server/credentials/google-service-account.json
```

7. Configurar `/opt/big-server/.env`:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_ID=
GOOGLE_OWNER_EMAIL=inaciooofc@gmail.com
GOOGLE_SERVICE_ACCOUNT_FILE=./credentials/google-service-account.json
```

Se `GOOGLE_SHEETS_ID` ficar vazio, o Big cria a planilha automaticamente.

## Criar planilha automaticamente

Pelo painel admin:

```text
Google Sheets → Inicializar planilha
```

Ou pelo terminal:

```bash
cd /opt/big-server
node scripts/sheets-bootstrap.js
```

## Abas criadas automaticamente

- Visão Geral
- Caminhos
- Rotas Web
- Endpoints API
- Usuários Exportados
- Presença
- Módulos
- Configurações Públicas
- Jogos
- Músicas
- Loja
- Logs Resumidos
- Roadmap
- Segurança

## Nunca exportar

- senhas
- hashes de senha
- tokens JWT
- chaves API privadas
- JSON da service account
- mensagens privadas
- sessões
