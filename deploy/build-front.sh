#!/bin/bash
# Build Vite du front Abel (sortie : dist/) — à lancer depuis la racine du repo ou via bootstrap-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
node_minor="$(node -v | sed 's/^v//' | cut -d. -f2)"
if [ "$node_major" -lt 20 ] || { [ "$node_major" -eq 20 ] && [ "$node_minor" -lt 19 ]; }; then
  echo "Node >= 20.19 requis pour le build front (actuel : $(node -v))" >&2
  exit 1
fi

if [ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]; then
  if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
    export VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
  elif [ -f "$ROOT/server/.env" ]; then
    VITE_GOOGLE_CLIENT_ID="$(grep '^GOOGLE_CLIENT_ID=' "$ROOT/server/.env" | cut -d= -f2- || true)"
    export VITE_GOOGLE_CLIENT_ID
  fi
fi

if [ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]; then
  echo "VITE_GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_ID requis pour le build front" >&2
  exit 1
fi

export VITE_SYNC_URL="${VITE_SYNC_URL:-https://vps-e09ed6db.vps.ovh.net/abel/api}"

npm ci
npm run build
echo "Front build OK → $ROOT/dist"
