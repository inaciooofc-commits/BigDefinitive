# Big Server antiX — versão robusta

Este pacote transforma a interface Big em um servidor real para antiX/Debian/Ubuntu, sem depender de `systemctl`.

## O que foi implementado

- Servidor Node.js com Express.
- App principal separado em `/member-app/`.
- Painel admin separado em `/admin-app/`.
- API REST para login, cadastro, usuários, banimentos, loja, catálogo, avisos, configurações e métricas.
- WebSocket em `/ws` para avisos globais, chat, mudanças de configuração, presença, mensagens privadas e métricas em tempo real.
- Persistência em JSON com escrita atômica dentro de `data/`.
- Admin inicial: `clzin@big.x` / `clzin123`.
- Regra de usuário:
  - `nome` cria comum com email `nome@big.x`.
  - `admin@nome` cria admin, mas email exibido fica `nome@big.x`.
- Monitoramento atualizado a cada segundo.
- Scripts antiX sem `systemctl`.
- PM2 se disponível, fallback com `nohup` se PM2 falhar.
- Autostart via `/etc/init.d/big-server` e `/etc/cron.d/big-server`.
- Menu terminal com mouse usando `dialog` ou `whiptail`.
- Cloudflare Tunnel opcional para acesso mundial.
- Backup local.
- Presença dos usuários com hora, data, timezone e bateria.
- Envio privado estilo WhatsApp: servidor recebe/roteia, mas não publica no chat global nem exibe conteúdo no painel admin.

## Instalação no antiX

```bash
cd big-server-antix
chmod +x install.sh
sudo ./install.sh
```

## Acessos

```text
App principal: http://localhost:8088/member-app/
Painel admin : http://localhost:8088/admin-app/
Admin inicial: clzin@big.x / clzin123
```

## Comandos

```bash
big-menu      # menu com seleção/mouse
big-start     # iniciar
big-stop      # parar
big-status    # status
big-tunnel    # acesso mundial via Cloudflare Tunnel
```

## Rodar direto, sem instalar em /opt

```bash
npm install
npm start
```

## Dados importantes

- Dados: `/opt/big-server/data`
- Logs: `/opt/big-server/logs`
- Porta padrão: `8088`
- Domínio local obrigatório: `big.x`

## Observação franca

A interface anterior era visual/protótipo. Esta atualização adiciona um backend real e robusto. Alguns botões visuais ainda podem ser evoluídos com telas mais profundas, mas o núcleo do servidor, autenticação, permissões, APIs, WebSocket, dados, admin e monitoramento já estão prontos para rodar no antiX.


## Novas funções 2.1

### Presença dos usuários

O app principal envia ao servidor, quando permitido pelo navegador:

- hora local;
- data local;
- timezone;
- nível de bateria;
- status carregando/não carregando.

Esses dados aparecem na lista de membros e no painel admin.

### Envio privado

Modelo implementado:

```text
User envia -> server recebe/roteia -> server não exibe em chat/admin -> outro user recebe
```

Endpoints principais:

```text
POST /api/messages/private
GET  /api/messages/private?peer=nome@big.x
PATCH /api/messages/private/:id/read
```

O painel admin registra apenas metadados. O conteúdo privado não é mostrado em logs visuais nem no painel. Veja `PRIVACY-MODEL.md`.
