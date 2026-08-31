# DNS OVH pour mimom.be

Dans **OVH Manager → Noms de domaine → mimom.be → Zone DNS**, ajoute ou modifie :

| Sous-domaine | Type | Cible | TTL |
|--------------|------|-------|-----|
| `@` (racine) | **A** | `51.178.44.114` | 300 |
| `www` | **A** | `51.178.44.114` | 300 |

(IP du VPS Abel : `vps-e09ed6db.vps.ovh.net`)

Attends la propagation (quelques minutes à 1 h), puis sur le VPS :

```bash
certbot --nginx -d mimom.be -d www.mimom.be
bash /opt/abel/deploy/bootstrap-vps.sh
```

## Google OAuth (obligatoire pour la connexion)

[Console Google Cloud → Identifiants](https://console.cloud.google.com/apis/credentials) → client OAuth « Application Web » :

**Origines JavaScript autorisées** — ajouter :

- `https://mimom.be`
- `https://www.mimom.be`

(Garder `https://vincentchauvaux.github.io` et `http://localhost:5173` si tu utilises encore GitHub Pages / le dev local.)
