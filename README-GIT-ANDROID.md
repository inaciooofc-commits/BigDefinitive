# Subir este ZIP no GitHub pelo Android

1. Baixe o ZIP `big-server-antix-git-ready.zip`.
2. Abra o app/site do GitHub no Android.
3. Crie um repositório novo, por exemplo: `Big`.
4. Toque em **Add file** → **Upload files**.
5. Envie o ZIP ou extraia no Android e envie os arquivos/pastas.
6. Commit sugerido:

```text
feat: add Big antiX server with presence and private delivery
```

## Importante

Este pacote foi preparado para Git:

- `node_modules/` não está dentro do ZIP.
- `data/` e `logs/` são criados automaticamente no antiX.
- As dependências são instaladas com `npm install` durante a instalação.

## Rodar depois de clonar no antiX

```bash
cd Big
chmod +x install.sh
sudo ./install.sh
```

Acessos:

```text
App principal: http://localhost:8088/member-app/
Painel admin : http://localhost:8088/admin-app/
Admin inicial: clzin@big.x / clzin123
```
