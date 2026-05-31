# Big — Stable antiX Server + Google Sheets

Projeto **Big**, criado por **Colômbia** e produzido por **Cl Inc. Enterteiments**.

Esta versão consolida todas as melhorias discutidas:

- antiX/Debian sem `systemctl`
- servidor Node.js em modo **fork/simples**, sem cluster
- app principal em `/member-app/`
- painel admin em `/admin-app/`
- API REST em `/api/*`
- WebSocket em `/ws`
- email local obrigatório `nome@big.x`
- admin criado com `admin@nome`, mas email final `nome@big.x`
- troca de senha pelo próprio usuário
- mensagens privadas estilo WhatsApp
- presença com hora, data, timezone e bateria
- loja com dinheiro fake
- party, chat, jogos, músicas, eventos e configurações
- Google Sheets automático com abas, cabeçalhos, filtros, exports e imports seguros

## Instalação no antiX

```bash
unzip big-server-antix-stable-sheets-final.zip
cd big-server-antix-stable-sheets-final
chmod +x *.sh scripts/*.js
sudo ./install.sh
```

## Iniciar

```bash
big-start
```

ou, dentro da pasta:

```bash
./start.sh
```

## Menu

```bash
big-menu
```

## Acessos

```text
App principal: http://localhost:8088/member-app/
Painel admin : http://localhost:8088/admin-app/
Health       : http://localhost:8088/health
```

## Admin inicial

```text
Login: clzin@big.x
Senha: clzin123
```

Também funciona login com:

```text
clzin
```

## Modo de execução

Não usa cluster.

```js
instances: 1
exec_mode: 'fork'
```

Isso é necessário porque o Big usa WebSocket, presença, chat, party e mensagens privadas em tempo real.
