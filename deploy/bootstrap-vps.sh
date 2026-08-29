#!/bin/bash
set -euo pipefail

REPO=https://github.com/vincentchauvaux/abel.git
ROOT=/opt/abel
GOOGLE_CLIENT_ID=245439358451-tirno0v3oqg88caaadlogu8atlpcrt54.apps.googleusercontent.com

if [ -d "$ROOT/.git" ]; then
  git -C "$ROOT" fetch origin
  git -C "$ROOT" reset --hard origin/main
else
  git clone "$REPO" "$ROOT"
fi

cd "$ROOT/server"
npm install --omit=dev

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

cp "$ROOT/deploy/nginx-abel.conf.example" /etc/nginx/snippets/abel.conf
if ! grep -q 'snippets/abel.conf' /etc/nginx/sites-enabled/streamtv; then
  sed -i '/include snippets\/hakou-live.conf;/a\    include snippets/abel.conf;' /etc/nginx/sites-enabled/streamtv
fi
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
