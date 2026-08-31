#!/bin/bash
set -euo pipefail

REPO=https://github.com/vincentchauvaux/abel.git
ROOT=/opt/abel

if [ -d "$ROOT/.git" ]; then
  git -C "$ROOT" fetch origin
  git -C "$ROOT" reset --hard origin/main
  # Re-exécuter le script après mise à jour (bash a déjà lu l’ancienne version).
  if [ "${ABEL_BOOTSTRAP_REEXEC:-}" != 1 ]; then
    export ABEL_BOOTSTRAP_REEXEC=1
    exec bash "$ROOT/deploy/bootstrap-vps.sh"
  fi
else
  git clone "$REPO" "$ROOT"
  export ABEL_BOOTSTRAP_REEXEC=1
  exec bash "$ROOT/deploy/bootstrap-vps.sh"
fi

cd "$ROOT/server"
npm install --omit=dev

if [ ! -f "$ROOT/server/.env" ]; then
  if [ -z "${GOOGLE_CLIENT_ID:-}" ]; then
    echo "GOOGLE_CLIENT_ID requis pour la première installation" >&2
    exit 1
  fi
  PASS=$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | head -c 32)
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='abel'" | grep -q 1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER abel WITH PASSWORD '${PASS}';"
  else
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER abel WITH PASSWORD '${PASS}';"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='abel'" | grep -q 1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE abel OWNER abel;"
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d abel -c "GRANT ALL ON SCHEMA public TO abel;"
  umask 077
  cat > "$ROOT/server/.env" <<EOF
PORT=3030
DATABASE_URL=postgres://abel:${PASS}@127.0.0.1:5432/abel
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
EOF
else
  if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
    if grep -q '^GOOGLE_CLIENT_ID=' "$ROOT/server/.env"; then
      sed -i "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}|" "$ROOT/server/.env"
    else
      echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> "$ROOT/server/.env"
    fi
  fi
fi

# Schéma / migrations (amount_ml nullable, remaining_ml, pumping_session_id, etc.)
sudo -u postgres psql -v ON_ERROR_STOP=1 -d abel -f "$ROOT/server/schema.sql" >/dev/null

# Rate limit zone (une fois dans http {})
if ! grep -q 'zone=abel_api' /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=abel_api:10m rate=30r/m;' /etc/nginx/nginx.conf
fi

# API sur le hostname VPS (le front reste sur GitHub Pages)
cp "$ROOT/deploy/nginx-abel.conf.example" /etc/nginx/snippets/abel.conf
if ! grep -q 'snippets/abel.conf' /etc/nginx/sites-enabled/streamtv; then
  sed -i '/include snippets\/hakou-live.conf;/a\    include snippets/abel.conf;' /etc/nginx/sites-enabled/streamtv
fi

# Désactiver un éventuel vhost abel.be (front = GitHub Pages)
rm -f /etc/nginx/sites-enabled/abel.be

nginx -t
systemctl reload nginx

cd "$ROOT/server"
pm2 delete abel >/dev/null 2>&1 || true
pm2 start index.mjs --name abel --cwd "$ROOT/server"
pm2 save

sleep 1
curl -fsS http://127.0.0.1:3030/health
echo
curl -fsS https://127.0.0.1/abel/api/health --resolve vps-e09ed6db.vps.ovh.net:443:127.0.0.1 || curl -fsSk https://vps-e09ed6db.vps.ovh.net/abel/api/health
echo
echo DEPLOY_OK
