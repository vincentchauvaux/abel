#!/bin/bash
# Ajoute une empreinte SHA-256 à public/.well-known/assetlinks.json
# (clé de téléchargement PWABuilder déjà présente ; ajouter celle de Play App Signing).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PACKAGE="${PACKAGE:-be.mimom.twa}"
SHA="${1:-}"
if [ -z "$SHA" ]; then
  echo "Usage: store/android/set-fingerprint.sh AB:CD:…:EF" >&2
  echo "Play Console → Intégrité de l’app → Signature de l’application → certificat de signature (SHA-256)." >&2
  exit 1
fi
SHA="$(echo "$SHA" | tr 'a-f' 'A-F' | tr -d ' ')"
mkdir -p "$ROOT/public/.well-known"
python3 - "$ROOT/public/.well-known/assetlinks.json" "$PACKAGE" "$SHA" <<'PY'
import json, sys
from pathlib import Path
path, package, sha = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
data = []
if path.exists():
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = []
if not isinstance(data, list):
    data = []
stmt = next(
    (
        s for s in data
        if isinstance(s, dict)
        and (s.get("target") or {}).get("package_name") == package
    ),
    None,
)
if stmt is None:
    stmt = {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": package,
            "sha256_cert_fingerprints": [],
        },
    }
    data.append(stmt)
fps = stmt.setdefault("target", {}).setdefault("sha256_cert_fingerprints", [])
if sha not in fps:
    fps.append(sha)
path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print("Écrit", path)
print("Empreintes", package + ":", ", ".join(fps))
PY
