# Big — Versão Definitiva antiX + Google Sheets

Esta é a versão consolidada do Big com todas as melhorias discutidas.

## Inclui

- Servidor Node.js para antiX/Debian sem systemd.
- Execução sem cluster: `instances: 1` e `exec_mode: fork`.
- App principal em `/member-app/`.
- Painel admin em `/admin-app/`.
- API REST e WebSocket em `/ws`.
- Email local `nome@big.x`.
- Criação de admin por `admin@nome`.
- Troca de senha pelo próprio usuário.
- Reset de senha pelo admin.
- Presença com hora, data, timezone, bateria e carregamento.
- Mensagens privadas estilo WhatsApp, sem exibir conteúdo ao admin.
- Chat global.
- Party de música.
- Loja com dinheiro fake.
- Jogos por catálogo.
- Google Sheets com bootstrap automático.
- Criação automática das abas, cabeçalhos e seções da planilha.
- Exportação e importação controlada.
- Menu `big-menu` para antiX.
- Scripts Termux sem root.
- Script auxiliar para corrigir SSH no antiX Core.

## Arquivos sensíveis

Esta versão local contém:

- `.env`
- `credentials/google-service-account.json`

Não publicar esses arquivos.

## Comandos principais

```bash
sudo ./install.sh
big-menu
big-start
big-stop
big-status
big-tunnel
```

## URLs

```text
http://localhost:8088/member-app/
http://localhost:8088/admin-app/
http://localhost:8088/health
```

## Admin inicial

```text
clzin@big.x
clzin123
```
