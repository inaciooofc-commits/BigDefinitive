#!/data/data/com.termux/files/usr/bin/bash
# Serve um script curto para arrumar SSH no antiX Core.
# Rode no Termux SEM root.

set -e

if [ "$(id -u)" = "0" ]; then
  echo "Não rode como root no Termux."
  exit 1
fi

pkg update -y
pkg install -y python coreutils

mkdir -p /sdcard/Download

cat > /sdcard/Download/sshfix.sh <<'EOS'
#!/bin/sh
set -e

echo "[BIG] Corrigindo SSH do antiX..."

if [ "$(id -u)" = "0" ]; then
  SUDO=""
else
  SUDO="sudo"
fi

if command -v apt >/dev/null 2>&1; then
  $SUDO apt update -y || true
  $SUDO apt install -y openssh-server openssh-client net-tools sudo || true
fi

TARGET_USER="$USER"
if [ "$(id -u)" = "0" ]; then
  if [ -d /home/cl ]; then
    TARGET_USER="cl"
  else
    TARGET_USER="$(ls /home 2>/dev/null | head -1)"
  fi
fi

if [ -z "$TARGET_USER" ]; then
  TARGET_USER="$USER"
fi

echo "[BIG] Usuário alvo: $TARGET_USER"
echo "[BIG] Defina/atualize a senha desse usuário:"
$SUDO passwd "$TARGET_USER" || true

$SUDO mkdir -p /etc/ssh/sshd_config.d

if [ -f /etc/ssh/sshd_config ]; then
  $SUDO cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%s)
fi

$SUDO sh -c 'cat > /etc/ssh/sshd_config.d/99-big-password.conf <<CONF
PasswordAuthentication yes
PubkeyAuthentication yes
KbdInteractiveAuthentication yes
ChallengeResponseAuthentication yes
PermitRootLogin no
UsePAM yes
CONF'

# Garante compatibilidade com antiX/Debian que não carrega sshd_config.d corretamente.
$SUDO sh -c "grep -q '^Include /etc/ssh/sshd_config.d/\\*.conf' /etc/ssh/sshd_config || printf '\nInclude /etc/ssh/sshd_config.d/*.conf\n' >> /etc/ssh/sshd_config"

$SUDO sshd -t

if command -v service >/dev/null 2>&1; then
  $SUDO service ssh restart || $SUDO service ssh start
elif [ -x /etc/init.d/ssh ]; then
  $SUDO /etc/init.d/ssh restart || $SUDO /etc/init.d/ssh start
else
  $SUDO /usr/sbin/sshd
fi

echo
echo "[BIG] SSH pronto."
echo "[BIG] IP do antiX:"
hostname -I || ip addr
echo
echo "[BIG] Do Termux, teste:"
echo "ssh -o PubkeyAuthentication=no $TARGET_USER@IP_DO_ANTIX"
EOS

chmod 644 /sdcard/Download/sshfix.sh

PHONE_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
if [ -z "$PHONE_IP" ]; then
  PHONE_IP="$(ip addr show wlan0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -1)"
fi

echo
echo "=========================================="
echo "No antiX Core, digite APENAS isto:"
echo
echo "wget -O s http://${PHONE_IP}:8080/sshfix.sh;sh s"
echo
echo "Se wget não existir, tente:"
echo "busybox wget -O s http://${PHONE_IP}:8080/sshfix.sh;sh s"
echo "=========================================="
echo
echo "Servidor ligado no Termux. Não feche esta tela."
echo "Arquivo servido: /sdcard/Download/sshfix.sh"
echo

cd /sdcard/Download
python -m http.server 8080
