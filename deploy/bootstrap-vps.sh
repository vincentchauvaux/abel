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

sudo -u postgres psql -v ON_ERROR_STOP=1 -d abel <<'EOSQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO abel', r.tablename);
  END LOOP;
END $$;

INSERT INTO baby_members (id, baby_id, user_id, role, joined_at, created_at)
SELECT gen_random_uuid(), b.id, b.user_id, 'owner', b.created_at, b.created_at
FROM babies b
WHERE b.deleted_at IS NULL
  AND b.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM baby_members m
    WHERE m.baby_id = b.id AND m.user_id = b.user_id AND m.deleted_at IS NULL
  );
EOSQL

# Rate limit zone (une fois dans http {})
if ! grep -q 'zone=abel_api' /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=abel_api:10m rate=120r/m;' /etc/nginx/nginx.conf
else
  sed -i 's|zone=abel_api:10m rate=[0-9]*r/m|zone=abel_api:10m rate=120r/m|' /etc/nginx/nginx.conf
fi
if ! grep -q 'snippets/abel-map.conf' /etc/nginx/nginx.conf; then
  cp "$ROOT/deploy/nginx-abel-map.conf.example" /etc/nginx/snippets/abel-map.conf
  sed -i '/http {/a\    include /etc/nginx/snippets/abel-map.conf;' /etc/nginx/nginx.conf
fi

# API sur le hostname VPS (GitHub Pages miroir) + site mimom.be
cp "$ROOT/deploy/nginx-abel-map.conf.example" /etc/nginx/snippets/abel-map.conf
cp "$ROOT/deploy/nginx-abel.conf.example" /etc/nginx/snippets/abel.conf
if ! grep -q 'snippets/abel.conf' /etc/nginx/sites-enabled/streamtv; then
  sed -i '/include snippets\/hakou-live.conf;/a\    include snippets/abel.conf;' /etc/nginx/sites-enabled/streamtv
fi

# Front Abel sur mimom.be (build base / + API /api/)
export VITE_BASE_PATH=/
export VITE_SYNC_URL="${VITE_SYNC_URL:-https://mimom.be/api}"
if [ -z "${GOOGLE_CLIENT_ID:-}" ] && [ -f "$ROOT/server/.env" ]; then
  GOOGLE_CLIENT_ID="$(grep '^GOOGLE_CLIENT_ID=' "$ROOT/server/.env" | cut -d= -f2- || true)"
  export GOOGLE_CLIENT_ID
fi
bash "$ROOT/deploy/build-front.sh"
mkdir -p /var/www/mimom
rsync -a --delete "$ROOT/dist/" /var/www/mimom/

cp "$ROOT/deploy/nginx-mimom.be.conf.example" /etc/nginx/sites-available/mimom.be
ln -sf /etc/nginx/sites-available/mimom.be /etc/nginx/sites-enabled/mimom.be

# Désactiver d’anciens vhosts Abel dédiés
rm -f /etc/nginx/sites-enabled/abel.be

if dig +short mimom.be A | grep -qE '^[0-9]'; then
  certbot --nginx -d mimom.be -d www.mimom.be --non-interactive --agree-tos --redirect --expand 2>/dev/null || true
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
if dig +short mimom.be A | grep -qE '^[0-9]'; then
  curl -fsSk "https://mimom.be/api/health" || curl -fsS "http://mimom.be/api/health" || true
  echo
fi
echo DEPLOY_OK
