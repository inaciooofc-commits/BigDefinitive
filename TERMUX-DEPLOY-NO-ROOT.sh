#!/data/data/com.termux/files/usr/bin/bash
# BIG AUTO DEPLOY NO ROOT — Termux -> antiX
# Este script NÃO usa root no Termux.
# Ele só usa sudo no antiX remoto, se o install.sh precisar instalar em /opt/big-server.

set -Eeuo pipefail

APP="BIG AUTO DEPLOY NO ROOT"
DEFAULT_HOST="192.168.0.6"
DEFAULT_USER="cl"
DEFAULT_ZIP="/sdcard/Download/big-server-antix-stable-sheets-final-local-ready.zip"
REMOTE_BASE="big-auto-deploy"

GREEN="\033[1;32m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
RESET="\033[0m"

say() { echo -e "${CYAN}[$APP]${RESET} $*"; }
ok() { echo -e "${GREEN}[OK]${RESET} $*"; }
warn() { echo -e "${YELLOW}[AVISO]${RESET} $*"; }
fail() { echo -e "${RED}[ERRO]${RESET} $*"; exit 1; }

check_not_root_termux() {
  if [ "$(id -u)" = "0" ]; then
    fail "Não rode este script como root no Termux. Saia do root e execute como usuário normal do Termux."
  fi

  case "$PREFIX" in
    /data/data/com.termux/files/usr*) ok "Termux detectado sem root." ;;
    *) warn "PREFIX do Termux não detectado. Continuando mesmo assim." ;;
  esac
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_termux_deps_no_root() {
  say "Instalando dependências no Termux sem root..."
  pkg update -y
  pkg install -y openssh unzip coreutils findutils procps

  if ! need_cmd sshpass; then
    pkg install -y sshpass >/dev/null 2>&1 || warn "sshpass não disponível. O script pode pedir senha manualmente."
  fi

  ok "Dependências do Termux prontas."
}

ensure_storage() {
  if [ ! -d "/sdcard/Download" ]; then
    warn "A pasta /sdcard/Download não está acessível."
    warn "Vou pedir permissão de armazenamento do Termux."
    termux-setup-storage || true
    sleep 3
  fi

  [ -d "/sdcard/Download" ] || fail "Sem acesso a /sdcard/Download. Abra o Termux novamente e rode o script de novo."
}

ask_inputs() {
  echo
  read -r -p "IP do antiX [${DEFAULT_HOST}]: " ANTIX_HOST
  ANTIX_HOST="${ANTIX_HOST:-$DEFAULT_HOST}"

  read -r -p "Usuário do antiX [${DEFAULT_USER}]: " ANTIX_USER
  ANTIX_USER="${ANTIX_USER:-$DEFAULT_USER}"

  read -r -p "Caminho do ZIP no Android [${DEFAULT_ZIP}]: " ZIP_PATH
  ZIP_PATH="${ZIP_PATH:-$DEFAULT_ZIP}"

  [ -f "$ZIP_PATH" ] || {
    warn "Não encontrei o ZIP em: $ZIP_PATH"
    say "Arquivos ZIP encontrados em /sdcard/Download:"
    find /sdcard/Download -maxdepth 1 -type f -name "*.zip" -printf " - %p\n" 2>/dev/null || true
    echo
    read -r -p "Digite o caminho correto do ZIP: " ZIP_PATH
  }

  [ -f "$ZIP_PATH" ] || fail "ZIP não encontrado: $ZIP_PATH"

  read -r -p "Usar senha automaticamente com sshpass? [s/N]: " USE_SSHPASS
  USE_SSHPASS="${USE_SSHPASS:-N}"

  ANTIX_PASS=""
  if [[ "$USE_SSHPASS" =~ ^[sS]$ ]]; then
    if need_cmd sshpass; then
      read -r -s -p "Senha do usuário ${ANTIX_USER} no antiX: " ANTIX_PASS
      echo
    else
      warn "sshpass não está instalado. Vou usar modo interativo."
      USE_SSHPASS="N"
    fi
  fi

  echo
  read -r -p "No antiX, instalar em /opt usando sudo? [S/n]: " USE_REMOTE_SUDO
  USE_REMOTE_SUDO="${USE_REMOTE_SUDO:-S}"
}

print_publickey_fix() {
  cat <<EOF

${YELLOW}O antiX recusou login por senha e aceitou apenas publickey.${RESET}

No terminal do antiX, rode este bloco UMA vez:

${CYAN}sudo passwd ${ANTIX_USER}

sudo mkdir -p /etc/ssh/sshd_config.d

sudo sh -c 'cat > /etc/ssh/sshd_config.d/99-big-password.conf <<CONF
PasswordAuthentication yes
PubkeyAuthentication yes
KbdInteractiveAuthentication yes
ChallengeResponseAuthentication yes
PermitRootLogin no
UsePAM yes
CONF'

sudo service ssh restart${RESET}

Depois volte ao Termux e rode este script novamente.

EOF
}

ssh_base_opts=(
  -o StrictHostKeyChecking=accept-new
  -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
  -o ConnectTimeout=10
)

ssh_password_opts=(
  -o PubkeyAuthentication=no
  -o PreferredAuthentications=password,keyboard-interactive
)

run_ssh() {
  local cmd="$1"
  if [[ "$USE_SSHPASS" =~ ^[sS]$ ]] && [ -n "$ANTIX_PASS" ]; then
    sshpass -p "$ANTIX_PASS" ssh "${ssh_base_opts[@]}" "${ssh_password_opts[@]}" "${ANTIX_USER}@${ANTIX_HOST}" "$cmd"
  else
    ssh "${ssh_base_opts[@]}" "${ANTIX_USER}@${ANTIX_HOST}" "$cmd"
  fi
}

run_ssh_tty() {
  local cmd="$1"
  if [[ "$USE_SSHPASS" =~ ^[sS]$ ]] && [ -n "$ANTIX_PASS" ]; then
    sshpass -p "$ANTIX_PASS" ssh -tt "${ssh_base_opts[@]}" "${ssh_password_opts[@]}" "${ANTIX_USER}@${ANTIX_HOST}" "$cmd"
  else
    ssh -tt "${ssh_base_opts[@]}" "${ANTIX_USER}@${ANTIX_HOST}" "$cmd"
  fi
}

run_scp() {
  local src="$1"
  local dst="$2"
  if [[ "$USE_SSHPASS" =~ ^[sS]$ ]] && [ -n "$ANTIX_PASS" ]; then
    sshpass -p "$ANTIX_PASS" scp "${ssh_base_opts[@]}" "${ssh_password_opts[@]}" "$src" "$dst"
  else
    scp "${ssh_base_opts[@]}" "$src" "$dst"
  fi
}

test_connection() {
  say "Testando SSH com ${ANTIX_USER}@${ANTIX_HOST}..."

  set +e
  OUT="$(run_ssh 'echo BIG_SSH_OK' 2>&1)"
  CODE=$?
  set -e

  if [ "$CODE" -ne 0 ]; then
    echo "$OUT"
    if echo "$OUT" | grep -qi "Permission denied (publickey)"; then
      print_publickey_fix
      exit 2
    fi
    fail "Não consegui conectar por SSH. Confirme IP, usuário, senha e sshd ligado no antiX."
  fi

  echo "$OUT" | grep -q "BIG_SSH_OK" || fail "Conexão SSH respondeu de forma inesperada."
  ok "SSH funcionando."
}

deploy_zip() {
  ZIP_NAME="$(basename "$ZIP_PATH")"
  REMOTE_DIR="${REMOTE_BASE}-$(date +%Y%m%d-%H%M%S)"

  say "Criando pasta remota: ~/${REMOTE_DIR}"
  run_ssh "mkdir -p ~/${REMOTE_DIR}"

  say "Enviando ZIP para o antiX..."
  run_scp "$ZIP_PATH" "${ANTIX_USER}@${ANTIX_HOST}:~/${REMOTE_DIR}/big.zip"
  ok "ZIP enviado."

  if [[ "$USE_REMOTE_SUDO" =~ ^[nN]$ ]]; then
    REMOTE_INSTALL_PREFIX=""
    warn "Modo sem sudo no antiX selecionado. O install.sh pode falhar se exigir /opt ou pacotes do sistema."
  else
    REMOTE_INSTALL_PREFIX="sudo "
  fi

  say "Descompactando e instalando no antiX..."
  REMOTE_SCRIPT=$(cat <<EOS
set -Ee
cd "\$HOME"/${REMOTE_DIR}
echo "[antiX] Preparando instalação..."
if command -v sudo >/dev/null 2>&1 && [ "${USE_REMOTE_SUDO}" != "n" ] && [ "${USE_REMOTE_SUDO}" != "N" ]; then
  sudo apt update -y || true
  sudo apt install unzip nodejs npm curl wget -y || true
else
  echo "[antiX] Sem sudo remoto: pulando apt install."
fi

rm -rf extracted
mkdir -p extracted
unzip -o big.zip -d extracted

cd extracted
PROJECT_DIR="\$(find . -maxdepth 2 -type f -name install.sh -printf '%h\n' | head -1)"
if [ -z "\$PROJECT_DIR" ]; then
  echo "[antiX] ERRO: install.sh não encontrado dentro do ZIP."
  exit 1
fi

cd "\$PROJECT_DIR"
chmod +x *.sh 2>/dev/null || true
chmod +x scripts/*.js 2>/dev/null || true

echo "[antiX] Projeto encontrado em: \$(pwd)"

if [ "${USE_REMOTE_SUDO}" = "n" ] || [ "${USE_REMOTE_SUDO}" = "N" ]; then
  echo "[antiX] Rodando install.sh sem sudo..."
  ./install.sh
else
  echo "[antiX] Rodando install.sh com sudo no antiX..."
  sudo ./install.sh
fi

echo
echo "[antiX] Instalação finalizada."
echo "[antiX] URLs:"
echo "  App principal: http://localhost:8088/member-app/"
echo "  Painel admin : http://localhost:8088/admin-app/"
echo "  Health       : http://localhost:8088/health"
EOS
)

  run_ssh_tty "$REMOTE_SCRIPT"
}

show_final() {
  cat <<EOF

${GREEN}Tudo pronto.${RESET}

Termux foi usado sem root.

No antiX, use:

${CYAN}big-menu${RESET}

Ou:

${CYAN}big-start
big-status${RESET}

Acesse:

${CYAN}http://localhost:8088/member-app/
http://localhost:8088/admin-app/
http://localhost:8088/health${RESET}

Login admin:

${CYAN}clzin@big.x
clzin123${RESET}

EOF
}

main() {
  clear
  echo -e "${GREEN}"
  echo "██████╗ ██╗ ██████╗ "
  echo "██╔══██╗██║██╔════╝ "
  echo "██████╔╝██║██║  ███╗"
  echo "██╔══██╗██║██║   ██║"
  echo "██████╔╝██║╚██████╔╝"
  echo "╚═════╝ ╚═╝ ╚═════╝ "
  echo -e "${RESET}"

  say "Deploy Termux -> antiX sem root no Termux"
  echo

  check_not_root_termux
  install_termux_deps_no_root
  ensure_storage
  ask_inputs
  test_connection
  deploy_zip
  show_final
}

main "$@"
