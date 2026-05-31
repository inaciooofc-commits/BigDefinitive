#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"
export NCURSES_NO_UTF8_ACS=1
DIALOG=""
if command -v dialog >/dev/null 2>&1; then DIALOG="dialog --clear --mouse"; elif command -v whiptail >/dev/null 2>&1; then DIALOG="whiptail"; fi
run_action(){
  case "$1" in
    start) ./start.sh ;;
    stop) ./stop.sh ;;
    restart) ./restart.sh ;;
    status) ./status.sh ;;
    logs) tail -n 120 -f logs/server.log ;;
    tunnel) ./cloudflare-tunnel.sh ;;
    backup) ./backup.sh ;;
    doctor) node scripts/doctor.js ;;
    sheets_status) node scripts/sheets-health.js ;;
    sheets_bootstrap) node scripts/sheets-bootstrap.js ;;
    urls) echo "App principal: http://localhost:${PORT:-8088}/member-app/"; echo "Painel admin : http://localhost:${PORT:-8088}/admin-app/"; echo "Admin inicial: clzin@big.x / clzin123" ;;
  esac
  echo; read -r -p "Pressione ENTER para voltar..." _ || true
}
while true; do
  if [ -n "$DIALOG" ]; then
    CHOICE=$($DIALOG --title "Big Server antiX" --menu "Controle frio do servidor" 22 82 11 \
      start "Iniciar servidor" stop "Parar servidor" restart "Reiniciar servidor" status "Status/health" logs "Ver logs em tempo real" tunnel "Abrir Cloudflare Tunnel" backup "Criar backup" doctor "Validar instalação" sheets_status "Google Sheets status" sheets_bootstrap "Inicializar Google Sheets" urls "Mostrar URLs" 3>&1 1>&2 2>&3) || exit 0
  else
    echo "1) iniciar 2) parar 3) reiniciar 4) status 5) logs 6) tunnel 7) backup 8) doctor 9) sheets status 10) sheets bootstrap 11) urls 0) sair"
    read -r -p "> " n
    case "$n" in 1) CHOICE=start;;2) CHOICE=stop;;3) CHOICE=restart;;4) CHOICE=status;;5) CHOICE=logs;;6) CHOICE=tunnel;;7) CHOICE=backup;;8) CHOICE=doctor;;9) CHOICE=sheets_status;;10) CHOICE=sheets_bootstrap;;11) CHOICE=urls;;0) exit 0;;*) continue;;esac
  fi
  clear
  run_action "$CHOICE"
done
