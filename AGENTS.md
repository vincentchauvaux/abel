# Abel

Application web pour le suivi quotidien d’un nourrisson : tétées, biberons, diversification, compléments, couches, tire-lait, croissance, sommeil, température, notes. Pensée pour une maman qui a le bébé dans les bras : **1 action = 1 pression = donnée enregistrée immédiatement**.

Fonctionne dans le **navigateur** (téléphone ou ordinateur), y compris hors ligne. Les dates sont stockées en **UTC** et affichées en heure locale.

## Philosophie produit

- Offline-first : 3 h du matin, pas de réseau, ça doit marcher.
- Pas de recommandation médicale. Les rappels sont des règles personnalisables.
- Chaque icône Outils ouvre un **module** (écran complet : action + historique + réglages). Cœur à droite du titre pour épingler l’outil en **Favoris** sur le dashboard (ordre de sélection, stocké en local).
- Le dashboard répond d’abord à : « Où en est mon bébé aujourd’hui ? »

## Navigation

```
Bébé | Dashboard (accueil) ↔ Outils (bouton central) | Profil (Google)
                  ├── APPORTS | SUIVI  (mémorisé en localStorage)
                  └── grille d’icônes → pages module
```

Tab bar : **Bébé** (sections en accordéon : identité, objectifs, horoscope, alertes, journal ; **Noter une entrée** juste au-dessus du journal) | bouton central (**Dashboard** = page d’accueil `/` ; depuis le dashboard → **Outils** `/tools` ; depuis un module → retour **Dashboard**) | **Profil** (accordéon : compte Google, co-parent, RGPD, légal).

Menu du bas en **position fixed**, **pleine largeur**. Les en-têtes de module (`←`) ramènent toujours au Dashboard. L’onglet Apports/Suivi sur Outils est **conservé** au retour depuis un module.

Activités en cours (tétée minuteur, sommeil, tire-lait à compléter) : bandeau sur **Outils** (au-dessus d’Apports/Suivi) et sur **Dashboard** (sous le titre), avec bouton Terminer / Réveil / Ouvrir.

## Arborescence

```
src/
  pages/          Dashboard, Outils, Bébé, Profil, modules
  components/     Layout (tab bar), ui
  db/             Dexie (IndexedDB) + api
  lib/            dates UTC, libellés FR, Google Identity Services
```

## Hébergement

- **App web** : **https://mimom.be/** (OVH VPS — front statique + API)
- **Miroir** : GitHub Pages — `https://vincentchauvaux.github.io/abel/`
- **API / sync** : `https://mimom.be/api/` (Node `127.0.0.1:3030`, PostgreSQL local sur le VPS)
- DNS : voir [`deploy/DNS-mimom.be.md`](deploy/DNS-mimom.be.md) (zone OVH → `51.178.44.114`)

Pages se déploie via GitHub Actions (workflow `.github/workflows/pages.yml`). Dans le repo : **Settings → Pages → Source = GitHub Actions** (pas « Deploy from a branch », sinon écran blanc / 404 sur `main.tsx`).

Déploiement API : `deploy/bootstrap-vps.sh` (snippet `deploy/nginx-abel.conf.example`).

En local : `npm install && npm run dev` puis ouvrir `http://localhost:5173/abel/`.

## Modules

### Apports

| Module | Rôle |
|---|---|
| Allaitement | Une carte « Noter une tétée » + case **Minuteur** : sans case = notée immédiatement ; avec case = démarre le timer. |
| Biberon | Type + heure + **quantité ml obligatoire**. Peut consommer du **stock** de lait tiré. |
| Diversification | Aliment + timestamp immédiat. |
| Compléments | Vitamine D / fer / autre, timestamp immédiat. Pas un conseil médical. |

Sur **Bébé**, le bouton **Noter une entrée** (formulaire intelligent Apports | Suivi) est placé juste au-dessus du journal. Case **Minuteur** cochée par défaut sur tétée pour démarrer le timer. Les modules Outils gardent le flux 1 tap dédié.

### Suivi

| Module | Rôle |
|---|---|
| Couche | Un appui = pipi, caca ou les deux. |
| Tire-lait | Quantité + date → **stock** (`remainingMl`). Consommé via Biberon lait maternel. |
| Croissance | Poids (kg), taille (cm), périmètre crânien (cm). |
| Sommeil | Start / stop, durée depuis `startedAt` / `endedAt`. |
| Température | Saisie °C uniquement ; code couleur indicatif (vert / orange / rouge). |
| Notes | Texte libre. Case **À faire** = rappel sur le dashboard (accordéon Notes : liste complète, tap pour marquer fait ; dans le journal, classée à la date `doneAt` avec libellé « fait » ; réouvrable depuis le journal). |

### Rappels repas

Règle après le dernier repas (tétée terminée ou biberon) : aucun / 1 h / 2 h / 3 h / 4 h / personnalisé (objectif Bébé + module Allaitement, même `delayMinutes`). Notification navigateur si l’onglet reste ouvert.

## Dashboard

Périodes : Aujourd’hui | 7 jours | 30 jours | Tout.

Cartes **Favoris** (si configurés) : raccourcis vers les outils épinglés depuis chaque module (cœur à droite du titre). **Accordéon Notes** puis **Alertes** repas / sommeil / couche. Puis **Apports** : biberon, diversification, compléments (une ligne par indicateur avec bouton **+**). Puis **Suivi** : couches, sommeil, tire-lait (stock et tiré sur la période), poids/taille/PC, temp. (même format liste avec **+**). **Graphiques** : repas (total par jour), sommeil, couches. **Entrées de la période** : journal synthétique en bas de page.

## Page Bébé

Identité du nourrisson, séparée du compte parent : **photo** (rond au-dessus du prénom, redimensionnée localement, éditable ; `+` si vide), prénom, date de naissance (`bornOn`, jour calendaire local), âge, **objectifs perso** (repas toutes les X h, biberon ml/cl optionnel par repas, **couche X min avant ou après le repas**), **horoscope du jour** (API via le VPS, cache local hors ligne), lectures traditionnelles occidentale et chinoise (cinq éléments), alertes. **Pas un avis médical.**

Le rappel repas du module Allaitement et l’objectif repas de Bébé sont la même règle (`delayMinutes`). Au sein, aucune quantité n’est demandée. Le biberon **exige** les ml à la saisie ; la quantité objectif est optionnelle sur Bébé. Le rappel couche (`diaperMinutes`, `diaperWhen` : `before` | `after`) part du dernier repas (tétée terminée ou biberon), pas de la dernière couche. Le lait tiré alimente un stock (`remainingMl`) sélectionnable au biberon.

## Auth Google

Google Identity Services (bouton « Se connecter avec Google » sur Profil). Client ID via `VITE_GOOGLE_CLIENT_ID`.

Créer le client OAuth « Application Web » : https://console.cloud.google.com/auth/clients

Identifiants : https://console.cloud.google.com/apis/credentials

Origines JS autorisées : `https://mimom.be`, `https://www.mimom.be`, `https://vincentchauvaux.github.io` et `http://localhost:5173`.

Pour GitHub Pages : secrets repo `VITE_GOOGLE_CLIENT_ID` et `VITE_SYNC_URL` (lus par `.github/workflows/pages.yml`).

## Sync VPS

API Node (`server/`) sur `127.0.0.1:3030`, Nginx `/abel/api/`, PostgreSQL local.

- URL : `https://mimom.be/api/` (alias legacy : `https://vps-e09ed6db.vps.ovh.net/abel/api/`)
- Horoscope du jour : `GET /horoscope?sign=taurus` (proxy ohmanda / viewbits, traduction FR, repli local par jour)
- Suppression compte : `DELETE /account` (auth Google, soft-delete toutes les données liées)
- Auth : jeton Google Identity Services (même Client ID que le front)
- **Source de vérité** : PostgreSQL sur le VPS quand Google est connecté. IndexedDB = cache hors ligne.
- `GET /sync` : télécharge le snapshot complet ; `POST /sync` : envoie les modifications en attente puis renvoie le snapshot.
- **Co-parent** : `GET /sharing`, `POST /invites`, `POST /invites/:id/accept|decline`, `DELETE /invites/:id` — invitation par e-mail Google, acceptation dans Profil, accès sync identique (max 2 personnes).
- Au démarrage (session Google + réseau) : pull VPS avant de créer un bébé vide local. Profil : bouton **Récupérer depuis le VPS**.
- Un bébé par compte Google ; un profil vide local ne remplace pas les données serveur.
- Offline-first : saisie locale immédiate, envoi dès réseau + session Google.
- **Co-parent temps réel (onglet ouvert)** : push auto ~2 s après chaque changement (~0,6 s pour start/stop chrono) ; pull VPS toutes les 20 s + au retour sur l’onglet, pour que l’autre parent voie tétée/sommeil/tire-lait en cours.

Déploiement : `GOOGLE_CLIENT_ID=... deploy/bootstrap-vps.sh` sur le VPS (clone `/opt/abel`, Postgres, PM2, Nginx). Snippet : `deploy/nginx-abel.conf.example` (déclarer `limit_req_zone` dans `http {}`).

La session Google est stockée localement. Sans jeton valide, l’app continue hors ligne. Sur Profil : rien d’alarmant si la sync est OK ; bouton Google de reconnexion seulement si le jeton a expiré.

## Légal et confidentialité

Pages accessibles depuis **Profil** ou `/legal/*` :

- **Mentions légales** — éditeur, hébergeurs (GitHub Pages + OVH).
- **Politique de confidentialité** — RGPD, finalités, droits, export/suppression.
- **CGU** — conditions d’utilisation.
- **Avertissement santé** — pas un dispositif médical.

Bandeau de consentement à la première visite (stockage local). Connexion Google = acceptation explicite de la sync vers le VPS.

**Profil** : export JSON, effacement local, `DELETE /account` (propriétaire = suppression bébé pour tous ; co-parent = quitter le partage). Accordéon **Co-parent** : inviter par e-mail, accepter/refuser les invitations reçues.

## Co-parent

- Invitation depuis **Profil → Co-parent** par l’e-mail Google du co-parent (valable 7 jours).
- L’invité voit l’invitation dans son **Profil** (badge sur l’onglet) une fois connecté avec ce compte.
- **Droits égaux** : saisie, sync, lecture pour les deux (1 propriétaire + 1 co-parent max).
- Tables VPS : `baby_members`, `baby_invites` ; accès sync via membership, pas seulement `babies.user_id`.

## Sécurité

- API en écoute `127.0.0.1` uniquement, derrière Nginx HTTPS.
- CORS restreint aux origines Abel.
- Auth Google obligatoire pour `/sync`, `/sharing`, `/invites` et `DELETE /account`.
- Rate limiting API (`/horoscope`, `/sync`, `/sharing`, `/invites`, `/account`) + Nginx `limit_req`.
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
| Hébergement | OVH VPS (mimom.be) + miroir GitHub Pages |
| Sync | VPS OVH `vps-e09ed6db.vps.ovh.net` (Node + Postgres) |
| Backend | VPS OVH uniquement |

Pas d’app native Expo. Pas de Next.js pour la V1 web.

## Modèle de données

```
babies (name, bornOn, photoUrl)
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
 └── reminder_rules (delayMinutes, bottleMl, bottleMinutes, diaperMinutes, diaperWhen)
```

Chaque table métier : `id` UUID, `babyId`, timestamps UTC, `deletedAt` (soft delete), `syncStatus`.

Page **Bébé** : sections en **accordéon** (un seul panneau ouvert à la fois), identité et objectifs en lecture une fois renseignés (bouton Modifier), journal chronologique éditable filtré par **jour** (aujourd’hui par défaut) et par type d’entrée (tri sur l’heure de fin pour tétées, sommeil et tire-lait chronométré). Édition journal : tétée (sein, état, durée), sommeil (début, durée), biberon/tire-lait (ml, durée tire-lait), couche, diversification, complément, température, mesures, notes.

## Conventions agent

- Répondre **en français**.
- Mettre à jour **ce fichier** après chaque changement structurel.
- Ne pas inventer de conseils médicaux.
- 1 tap = 1 donnée.
- Dates UTC en base.
- Ne pas committer sauf demande explicite.
- Abel n’utilise que le VPS OVH `vps-e09ed6db.vps.ovh.net` (quand un backend existera). Aucun autre serveur.
