# Segurança do Big

- Senhas usam bcrypt.
- Usuários podem trocar a própria senha em `/api/me/password`.
- Admin pode resetar senha, mas nunca ver senha atual.
- Mensagens privadas são entregues apenas para remetente e destinatário.
- O painel admin vê apenas metadados de mensagens privadas.
- Google Sheets não exporta senhas, tokens ou mensagens privadas.
- Credenciais Google ficam em `credentials/`, fora do Git.
- `.env` fica fora do Git.
- O servidor roda em modo fork/simples, sem cluster.
