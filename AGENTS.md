# Abel

Application mobile iOS + Android pour le suivi quotidien d’un nourrisson : tétées, biberons, couches, tire-lait, croissance. Pensée pour une maman qui a le bébé dans les bras : **1 action = 1 pression = donnée enregistrée immédiatement**.

Les dates sont stockées en **UTC** et affichées en heure locale.

## Philosophie produit

- Offline-first : 3 h du matin, pas de réseau, ça doit marcher.
- Pas de recommandation médicale. Les rappels sont des règles personnalisables.
- Chaque icône Outils ouvre un **module** (écran complet : action + historique + réglages), pas un simple raccourci.
- Le dashboard répond d’abord à : « Où en est mon bébé aujourd’hui ? » Les graphiques viennent ensuite.

## Navigation

```
Connexion Google (Profil, optionnelle en V1)
    → Dashboard  ←→  Outils (bouton central)
                         ├── APPORTS | SUIVI  (switch)
                         └── grille d’icônes → pages module
```

Tab bar : **Dashboard** | **bouton central (switch)** | **Profil**.
Le bouton central est plus gros. Sur Dashboard il mène à Outils, sur Outils il ramène au Dashboard.

## Arborescence

```
src/app/
  _layout.tsx                 # Stack + init SQLite
  (tabs)/
    _layout.tsx               # Tab bar custom
    index.tsx                 # Dashboard
    tools.tsx
    profile.tsx
  feeding/index.tsx
  bottle/index.tsx
  diapers/index.tsx
  pumping/index.tsx
  growth/index.tsx
src/components/               # TabBar, Tools, Screen, ModuleHeader, ui
src/theme/
src/db/                       # schema Drizzle, client sqlite, init, api
src/lib/                      # dates UTC, auth Google, sync, notifications
supabase/schema.sql           # PostgreSQL + RLS (à coller dans Supabase)
```

Lancer : `npx expo start`. Google Sign-In et la sync nécessitent un **development build EAS** (pas Expo Go) et un fichier `.env` (voir `.env.example`). Schéma distant : exécuter `supabase/schema.sql`.

## Hébergement et builds

- **Site vitrine** : GitHub Pages (comme hakou) — `index.html` à la racine, URL `https://vincentchauvaux.github.io/abel/` une fois Pages activé.
- **Backend / sync** : uniquement le VPS OVH `vps-e09ed6db.vps.ovh.net` (`51.178.44.114`, SSH `root`). Nginx, préfixe public prévu `/abel/`.
- **App iOS/Android** : GitHub Actions déclenche **EAS Build** (compilation chez Expo, pas sur le VPS). Secret repo `EXPO_TOKEN`. Workflow manuel : Actions → *EAS Build*.
- Premier lien Expo : une fois, en local, `npx eas init` (compte expo.dev) pour remplir `extra.eas.projectId` dans `app.json`.

## Modules

### Apports (ce qu’on donne)

| Module | V1 | Rôle |
|---|---|---|
| Allaitement | oui | Session avec segments Gauche / Droit / Les deux. Timer basé sur `started_at` / `ended_at`, jamais `setInterval` comme source de vérité. Changement de sein en cours de tétée. |
| Biberon | oui | ml + type (lait maternel / lait infantile) + heure. |
| Diversification | non (V2+) | Aliments. |
| Compléments | non (V2+) | Vitamines, optionnel. |

### Suivi (ce qu’on observe)

| Module | V1 | Rôle |
|---|---|---|
| Couche | oui | Un appui = pipi, caca ou les deux. Date/heure immédiates. Modification possible ensuite. |
| Tire-lait | oui | Appui = timestamp immédiat, puis fiche (ml, durée optionnelle, côté). |
| Croissance | oui | Poids (kg), taille (cm), périmètre crânien (cm). |
| Sommeil / Température / Notes | non (V2) | — |

### Rappels tétées

Règle après la dernière tétée : aucun / 1 h / 2 h / 3 h / personnalisé. Notification locale (`expo-notifications`). Annuler / reprogrammer à chaque fin de tétée.

## Dashboard (V1)

Périodes : Aujourd’hui | 7 jours | 30 jours | Tout.

1. Résumé du jour : tétées, couches, durée allaitement, ml tirés
2. Dernière tétée + prochain rappel
3. Graphiques 7 jours : durée allaitement, ml biberons, couches, poids

Charts : **react-native-gifted-charts** (V1). Victory Native XL plus tard si l’interaction le justifie.

## Stack

| Besoin | Choix |
|---|---|
| App | React Native + Expo SDK 57 (`expo@^57.0.17` min. pour correctifs Hermes). Node **>= 20.19.4** (SDK 57). |
| Langage | TypeScript |
| Navigation | Expo Router (`src/app`) |
| UI | StyleSheet React Native (NativeWind 4 possible plus tard ; pas NativeWind 5 pre-release) |
| Icônes | lucide-react-native |
| Charts | react-native-gifted-charts |
| Backend | PostgreSQL + Auth sur le VPS OVH (`vps-e09ed6db.vps.ovh.net`) |
| Google | `@react-native-google-signin/google-signin` → token → Auth VPS (dev build, pas Expo Go) |
| Local | expo-sqlite + Drizzle ORM (`useLiveQuery`) |
| Secrets | Expo SecureStore |
| Notifs | expo-notifications |
| Build | EAS Build, déclenché depuis GitHub Actions |

Pas de Next.js / PWA comme app principale (notifs, offline, timer en arrière-plan).

SQLCipher (chiffrement local) : prévu, pas bloquant. RLS + Auth + pas de donnée inutile dès le départ.

## Modèle de données

```
users (Supabase Auth)
 └── babies
      ├── feeding_sessions
      │    └── feeding_segments (side: LEFT | RIGHT | BOTH)
      ├── bottle_feeds
      ├── diaper_events (pipi / caca / both)
      ├── pumping_sessions
      ├── measurements (WEIGHT | HEIGHT | HEAD_CIRCUMFERENCE)
      ├── reminder_rules
      ├── sleep_sessions      (V2)
      └── notes               (V2)
```

Chaque table métier : `id` UUID, `baby_id`, timestamps UTC, `deleted_at` (soft delete), champ de sync (`pending` / `synced`).

Offline : écriture SQLite immédiate → sync vers Supabase quand le réseau revient. Conflits V1 : last-write-wins sur `updated_at`.

V1 : un seul bébé local (seed « Bébé » au premier lancement).

## MVP (ordre de construction)

1. Scaffold Expo Router + tab bar (Dashboard / switch / Profil) — fait
2. Page Outils + switch Apports / Suivi + grilles d’icônes — fait
3. SQLite + Drizzle + schéma local — fait
4. Module Allaitement (timer + segments) — fait
5. Couches (1 tap) — fait
6. Tire-lait + Biberon — fait
7. Croissance — fait
8. Dashboard (résumé + charts) — fait
9. Rappels locaux — fait
10. Auth Google + Supabase + sync — fait (config `.env` + EAS pour activer)

V2 : sommeil, température, notes, médicaments.
V3 : multi-parents, multi-bébés, Health, export PDF.

## Conventions agent

- Répondre **en français**.
- Mettre à jour **ce fichier** après chaque changement structurel (stack, modules, modèle, navigation).
- Ne pas inventer de conseils médicaux.
- Privilégier un tap = une donnée. Formulaires uniquement pour ml / mesures / édition.
- Dates toujours UTC en base.
- Ne pas committer sauf demande explicite.
- Abel n’utilise que le VPS OVH `vps-e09ed6db.vps.ovh.net`. Aucun autre serveur.
