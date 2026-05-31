# Modelo de envio privado do Big

O envio privado foi implementado no modelo pedido:

```text
User envia -> server recebe/roteia -> server não publica nem mostra no admin -> outro user recebe
```

## O que o servidor faz

- Recebe uma mensagem privada enviada pelo usuário.
- Armazena em `data/private-messages.json` para entrega e histórico entre remetente/destinatário.
- Entrega via WebSocket para o destinatário online.
- Permite buscar a conversa apenas quando o usuário autenticado é remetente ou destinatário.
- Registra em log apenas metadados: quem enviou para quem e horário.
- Não coloca o conteúdo no chat global.
- Não exibe conteúdo privado no painel admin.

## Observação fria e precisa

A versão atual usa envelope `big-sealed:v1` com codificação no cliente para evitar exibição direta e para cumprir a política operacional do servidor. Isso não é criptografia ponta-a-ponta real. Para E2EE forte, a próxima evolução deve usar Web Crypto com chaves públicas por usuário e criptografia no dispositivo antes do envio.
