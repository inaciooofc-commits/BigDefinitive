# Big sem cluster no antiX

O Big não deve usar cluster porque usa WebSocket, presença, mensagens privadas e estado em tempo real.

Configuração correta:

```js
instances: 1
exec_mode: 'fork'
```

Limpar cluster antigo:

```bash
pm2 delete big-server 2>/dev/null || true
pm2 kill 2>/dev/null || true
pkill -f server.js 2>/dev/null || true
BIG_KILL_PORT=1 ./start.sh
```
