# Abel

Application web pour le suivi quotidien d’un nourrisson : tétées, biberons, couches, tire-lait, croissance. Pensée pour une maman qui a le bébé dans les bras : **1 action = 1 pression = donnée enregistrée immédiatement**.

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
Profil
```

## Arborescence

```
src/
  pages/          Dashboard, Outils, Profil, modules
  components/     Layout (tab bar), ui
  db/             Dexie (IndexedDB) + api
  lib/            dates UTC, libellés FR
```

## Hébergement

- **App web** : GitHub Pages — `https://vincentchauvaux.github.io/abel/`
- **Backend / sync (plus tard)** : VPS OVH `vps-e09ed6db.vps.ovh.net` uniquement.

Pages se déploie via GitHub Actions (workflow `.github/workflows/pages.yml`). Dans le repo : Settings → Pages → **GitHub Actions**.

En local : `npm install && npm run dev` puis ouvrir `http://localhost:5173/abel/`.

## Modules V1

Apports : Allaitement (timer sur `started_at` / `ended_at`), Biberon.  
Suivi : Couche (1 tap), Tire-lait, Croissance.

## Stack

| Besoin | Choix |
|---|---|
| App | React 19 + Vite (TypeScript) |
| UI | CSS, mobile-first, lucide-react |
| Local | IndexedDB via Dexie |
| Routing | react-router HashRouter (GitHub Pages) |
| Hébergement | GitHub Pages |
| Backend | VPS plus tard |

Pas d’app native Expo. Pas de Next.js pour la V1 web.

## Modèle de données

Inchangé : babies → feeding_sessions / segments, bottle_feeds, diaper_events, pumping_sessions, measurements, reminder_rules. Soft delete, timestamps UTC.

## Conventions agent

- Répondre **en français**.
- Mettre à jour **ce fichier** après chaque changement structurel.
- Ne pas inventer de conseils médicaux.
- 1 tap = 1 donnée.
- Dates UTC en base.
- Ne pas committer sauf demande explicite.
- Abel n’utilise que le VPS OVH `vps-e09ed6db.vps.ovh.net` (quand un backend existera). Aucun autre serveur.
