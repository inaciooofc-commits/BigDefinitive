# Subir Big pelo Android / Termux

```bash
pkg update -y
pkg install git unzip -y

git config --global user.name "Colômbia"
git config --global user.email "inaciooofc@gmail.com"
git config --global init.defaultBranch master
git config --global --add safe.directory '*'

cd /sdcard/Download
unzip big-server-antix-stable-sheets-final.zip -d Big
cd Big/big-server-antix-stable-sheets-final 2>/dev/null || cd Big

git init
git branch -M master
git remote remove origin 2>/dev/null
git remote add origin https://github.com/inaciooofc-commits/Big.git

git add .
git commit -m "feat: add stable Big antiX server with Google Sheets"
git push -u origin master --force
```

Não suba:

- `.env`
- `credentials/google-service-account.json`
- tokens
- senhas
