# Abel

Application web pour le suivi quotidien d’un nourrisson : tétées, biberons, diversification, compléments, couches, tire-lait, croissance, sommeil, température, notes. Pensée pour une maman qui a le bébé dans les bras : **1 action = 1 pression = donnée enregistrée immédiatement**.

Fonctionne dans le **navigateur** (téléphone ou ordinateur), y compris hors ligne. Les dates sont stockées en **UTC** et affichées en heure locale.

## Philosophie produit

- Offline-first : 3 h du matin, pas de réseau, ça doit marcher.
- Pas de recommandation médicale. Les rappels sont des règles personnalisables.
- Chaque icône Outils ouvre un **module** (écran complet : action + historique + réglages).
- Le dashboard répond d’abord à : « Où en est mon bébé aujourd’hui ? »

## Navigation

```
Dashboard  ←→  Outils (bouton central)
                  ├── APPORTS | SUIVI  (switch)
                  └── grille d’icônes → pages module
Profil (Google)
```

Tab bar : bouton central (gros, Dashboard ↔ Outils) | Profil. Pas de troisième onglet Dashboard à gauche.

## Arborescence

```
src/
  pages/          Dashboard, Outils, Profil, modules
  components/     Layout (tab bar), ui
  db/             Dexie (IndexedDB) + api
  lib/            dates UTC, libellés FR, Google Identity Services
```

## Hébergement

- **App web** : GitHub Pages — `https://vincentchauvaux.github.io/abel/`
- **Backend / sync (plus tard)** : VPS OVH `vps-e09ed6db.vps.ovh.net` uniquement.

Pages se déploie via GitHub Actions (workflow `.github/workflows/pages.yml`). Dans le repo : Settings → Pages → **GitHub Actions**.

En local : `npm install && npm run dev` puis ouvrir `http://localhost:5173/abel/`.

## Modules

### Apports

| Module | Rôle |
|---|---|
| Allaitement | Session avec segments Gauche / Droit / Les deux. Timer basé sur `startedAt` / `endedAt`. |
| Biberon | ml + type (lait maternel / lait infantile) + heure. |
| Diversification | Aliment + timestamp immédiat. |
| Compléments | Vitamine D / fer / autre, timestamp immédiat. Pas un conseil médical. |

### Suivi

| Module | Rôle |
|---|---|
| Couche | Un appui = pipi, caca ou les deux. |
| Tire-lait | Appui = timestamp, puis fiche (ml, durée optionnelle, côté). |
| Croissance | Poids (kg), taille (cm), périmètre crânien (cm). |
| Sommeil | Start / stop, durée depuis `startedAt` / `endedAt`. |
| Température | Saisie °C uniquement. |
| Notes | Texte libre. |

### Rappels tétées

Règle après la dernière tétée : aucun / 1 h / 2 h / 3 h / personnalisé. Notification navigateur si l’onglet reste ouvert.

## Dashboard

Périodes : Aujourd’hui | 7 jours | 30 jours | Tout.

Graphiques 7 / 30 jours : défilement horizontal dans la carte (pas de débordement).

## Auth Google

Google Identity Services (bouton « Se connecter avec Google » sur Profil). Client ID via `VITE_GOOGLE_CLIENT_ID`.

Créer le client OAuth « Application Web » : https://console.cloud.google.com/auth/clients

Identifiants : https://console.cloud.google.com/apis/credentials

Origines JS autorisées : `https://vincentchauvaux.github.io` et `http://localhost:5173`.

Pour GitHub Pages : secrets repo `VITE_GOOGLE_CLIENT_ID` et `VITE_SYNC_URL` (lus par `.github/workflows/pages.yml`).

## Sync VPS

API Node (`server/`) sur `127.0.0.1:3030`, Nginx `/abel/api/`, PostgreSQL local.

- URL : `https://vps-e09ed6db.vps.ovh.net/abel/api/`
- Auth : jeton Google Identity Services (même Client ID que le front)
- Offline-first : IndexedDB d’abord, envoi dès qu’il y a réseau + session Google
- Un bébé par compte Google (dernier écrit gagne sur `updatedAt`)

Déploiement : clone `/opt/abel`, `server/.env` (`DATABASE_URL`, `GOOGLE_CLIENT_ID`), `pm2 start --name abel index.mjs`, snippet `deploy/nginx-abel.conf.example`.

La session Google est stockée localement. Sans jeton valide, l’app continue hors ligne.

## Stack

| Besoin | Choix |
|---|---|
| App | React 19 + Vite (TypeScript) |
| UI | CSS, mobile-first, lucide-react |
| Local | IndexedDB via Dexie |
| Routing | react-router HashRouter (GitHub Pages) |
| Auth | Google Identity Services |
| Hébergement | GitHub Pages |
| Sync | VPS OVH `vps-e09ed6db.vps.ovh.net` (Node + Postgres) |
| Backend | VPS OVH uniquement |

Pas d’app native Expo. Pas de Next.js pour la V1 web.

## Modèle de données

```
babies
 ├── feeding_sessions → feeding_segments
 ├── bottle_feeds
 ├── solid_foods
 ├── supplements
 ├── diaper_events
 ├── pumping_sessions
 ├── measurements
 ├── sleep_sessions
 ├── temperatures
 ├── notes
 └── reminder_rules
```

Chaque table métier : `id` UUID, `babyId`, timestamps UTC, `deletedAt` (soft delete), `syncStatus`.

## Conventions agent

- Répondre **en français**.
- Mettre à jour **ce fichier** après chaque changement structurel.
- Ne pas inventer de conseils médicaux.
- 1 tap = 1 donnée.
- Dates UTC en base.
- Ne pas committer sauf demande explicite.
- Abel n’utilise que le VPS OVH `vps-e09ed6db.vps.ovh.net` (quand un backend existera). Aucun autre serveur.
