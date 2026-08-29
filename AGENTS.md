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
Bébé | Outils (accueil) ↔ Dashboard (bouton central) | Profil (Google)
                  ├── APPORTS | SUIVI  (mémorisé en localStorage)
                  └── grille d’icônes → pages module
```

Tab bar : **Bébé** (identité, objectifs, horoscope, alertes, **formulaire intelligent pour noter tout outil**, **journal éditable**) | bouton central (**Outils** = page d’accueil `/` ; depuis Outils → **Dashboard** `/dashboard` ; depuis un module → retour **Outils**) | **Profil** (compte Google, sync).

Menu du bas en **position fixed** (sticky bottom). Les en-têtes de module (`←`) ramènent toujours à Outils. L’onglet Apports/Suivi est **conservé** au retour depuis un module.

## Arborescence

```
src/
  pages/          Dashboard, Outils, Bébé, Profil, modules
  components/     Layout (tab bar), ui
  db/             Dexie (IndexedDB) + api
  lib/            dates UTC, libellés FR, Google Identity Services
```

## Hébergement

- **App web** : `https://abel.be/` (VPS OVH, Nginx + build statique)
- **API / sync** : `https://abel.be/api/` (Node sur `127.0.0.1:3030`, PostgreSQL local)
- **Miroir** : GitHub Pages `https://vincentchauvaux.github.io/abel/` (base `/abel/`, API legacy sur le hostname VPS)

Déploiement VPS : `deploy/bootstrap-vps.sh` (clone `/opt/abel`, build front → `/var/www/abel`, Certbot, PM2). Snippets : `deploy/nginx-abel.be.conf.example`, `deploy/nginx-abel.conf.example`.

En local : `npm install && npm run dev` puis ouvrir `http://localhost:5173/abel/`.

## Modules

### Apports

| Module | Rôle |
|---|---|
| Allaitement | Une carte « Noter une tétée » + case **Minuteur** : sans case = notée immédiatement ; avec case = démarre le timer. |
| Biberon | Type + heure + **quantité ml obligatoire**. Peut consommer du **stock** de lait tiré. |
| Diversification | Aliment + timestamp immédiat. |
| Compléments | Vitamine D / fer / autre, timestamp immédiat. Pas un conseil médical. |
| Entrée manuelle | Formulaire intelligent (même composant que sur Bébé) : choix de l’outil + options adaptées. |

Sur **Bébé**, la carte « Noter une entrée » commence par **Apports | Suivi**, puis l’outil (tétée 1 tap, couche, biberon, etc.). Case **Minuteur** sur tétée pour démarrer le timer. Les modules Outils gardent le flux 1 tap dédié.

### Suivi

| Module | Rôle |
|---|---|
| Couche | Un appui = pipi, caca ou les deux. |
| Tire-lait | Quantité + date → **stock** (`remainingMl`). Consommé via Biberon lait maternel. |
| Croissance | Poids (kg), taille (cm), périmètre crânien (cm). |
| Sommeil | Start / stop, durée depuis `startedAt` / `endedAt`. |
| Température | Saisie °C uniquement. |
| Notes | Texte libre. |

### Rappels tétées

Règle après la dernière tétée : aucun / 1 h / 2 h / 3 h / 4 h / personnalisé (aussi sur Bébé). Notification navigateur si l’onglet reste ouvert.

## Dashboard

Périodes : Aujourd’hui | 7 jours | 30 jours | Tout.

Graphiques 7 / 30 jours : défilement horizontal dans la carte (pas de débordement), valeur écrite dans chaque barre. Stats : tétées, couches, allaitement, biberons, tire-lait, stock lait. Poids affiché dès une pesée.

## Page Bébé

Identité du nourrisson, séparée du compte parent : prénom, date de naissance (`bornOn`, jour calendaire local), âge, **objectifs perso** (tétées toutes les X h, biberon toutes les X h, ml/cl par repas, **couche X min après le repas**), **horoscope du jour** (API via le VPS, cache local hors ligne), lectures traditionnelles occidentale et chinoise (cinq éléments), alertes. **Pas un avis médical.**

Le rappel tétée du module Allaitement et l’objectif tétée de Bébé sont la même règle (`delayMinutes`). Au sein, aucune quantité n’est demandée. Le biberon **exige** les ml. Le rappel couche (`diaperMinutes`) part du dernier repas (tétée terminée ou biberon), pas de la dernière couche. Le lait tiré alimente un stock (`remainingMl`) sélectionnable au biberon.

## Auth Google

Google Identity Services (bouton « Se connecter avec Google » sur Profil). Client ID via `VITE_GOOGLE_CLIENT_ID`.

Créer le client OAuth « Application Web » : https://console.cloud.google.com/auth/clients

Identifiants : https://console.cloud.google.com/apis/credentials

Origines JS autorisées : `https://abel.be`, `https://vincentchauvaux.github.io` et `http://localhost:5173`.

Pour GitHub Pages : secrets repo `VITE_GOOGLE_CLIENT_ID` et `VITE_SYNC_URL` (lus par `.github/workflows/pages.yml`).

## Sync VPS

API Node (`server/`) sur `127.0.0.1:3030`, Nginx `/abel/api/`, PostgreSQL local.

- URL : `https://abel.be/api/` (legacy : `https://vps-e09ed6db.vps.ovh.net/abel/api/`)
- Horoscope du jour : `GET /horoscope?sign=taurus` (proxy public, cache 1 jour, hors connexion = texte local)
- Suppression compte : `DELETE /account` (auth Google, soft-delete toutes les données liées)
- Auth : jeton Google Identity Services (même Client ID que le front)
- Offline-first : IndexedDB d’abord, envoi dès qu’il y a réseau + session Google
- Un bébé par compte Google (dernier écrit gagne sur `updatedAt`)

Déploiement : `GOOGLE_CLIENT_ID=... deploy/bootstrap-vps.sh` sur le VPS (clone `/opt/abel`, Postgres, PM2, Nginx). Snippet : `deploy/nginx-abel.conf.example` (déclarer `limit_req_zone` dans `http {}`).

La session Google est stockée localement. Sans jeton valide, l’app continue hors ligne. Sur Profil : rien d’alarmant si la sync est OK ; bouton Google de reconnexion seulement si le jeton a expiré.

## Légal et confidentialité

Pages accessibles depuis **Profil** ou `/legal/*` :

- **Mentions légales** — éditeur, hébergeurs (GitHub Pages + OVH).
- **Politique de confidentialité** — RGPD, finalités, droits, export/suppression.
- **CGU** — conditions d’utilisation.
- **Avertissement santé** — pas un dispositif médical.

Bandeau de consentement à la première visite (stockage local). Connexion Google = acceptation explicite de la sync vers le VPS.

**Profil** : export JSON, effacement local, `DELETE /account` pour suppression serveur.

## Sécurité

- API en écoute `127.0.0.1` uniquement, derrière Nginx HTTPS.
- CORS restreint aux origines Abel.
- Auth Google obligatoire pour `/sync` et `DELETE /account`.
- Rate limiting API (`/horoscope`, `/sync`, `/account`) + Nginx `limit_req`.
- En-têtes : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `HSTS` (nginx).
- `VITE_GOOGLE_CLIENT_ID` via secrets — pas de Client ID en dur dans le code.
- Pas de cookies de traçage tiers.

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
babies (name, bornOn)
 ├── feeding_sessions → feeding_segments
 ├── bottle_feeds (amountMl, pumpingSessionId?)
 ├── solid_foods
 ├── supplements
 ├── diaper_events
 ├── pumping_sessions (amountMl, remainingMl)
 ├── measurements
 ├── sleep_sessions
 ├── temperatures
 ├── notes
 └── reminder_rules (delayMinutes, bottleMl, bottleMinutes, diaperMinutes)
```

Chaque table métier : `id` UUID, `babyId`, timestamps UTC, `deletedAt` (soft delete), `syncStatus`.

Page **Bébé** : identité et objectifs en **lecture** une fois renseignés (bouton Modifier), journal chronologique éditable. Édition tétée : Notée | Minuteur | Terminée (+ durée en minutes).

## Conventions agent

- Répondre **en français**.
- Mettre à jour **ce fichier** après chaque changement structurel.
- Ne pas inventer de conseils médicaux.
- 1 tap = 1 donnée.
- Dates UTC en base.
- Ne pas committer sauf demande explicite.
- Abel n’utilise que le VPS OVH `vps-e09ed6db.vps.ovh.net` (quand un backend existera). Aucun autre serveur.
