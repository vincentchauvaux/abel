# Abel

Application web pour le suivi quotidien d’un nourrisson : tétées, biberons, diversification, compléments, couches, tire-lait, croissance, sommeil, température, notes. Pensée pour une maman qui a le bébé dans les bras : **1 action = 1 pression = donnée enregistrée immédiatement**.

Fonctionne dans le **navigateur** (téléphone ou ordinateur), y compris hors ligne. Les dates sont stockées en **UTC** et affichées en heure locale.

## Philosophie produit

- Offline-first : 3 h du matin, pas de réseau, ça doit marcher.
- Pas de recommandation médicale. Les rappels sont des règles personnalisables.
- Chaque icône Outils ouvre un **module** (écran complet : action + historique + réglages). Cœur à droite du titre pour épingler l’outil en **Favoris** sur le dashboard (ordre de sélection, stocké en local). Si aucun favori : section Favoris avec **+** et liste déroulante pour en ajouter depuis le dashboard.
- Le dashboard répond d’abord à : « Où en est mon bébé aujourd’hui ? »

## Navigation

```
Bébé | Dashboard (accueil) ↔ Outils (bouton central) | Profil (Google)
                  ├── APPORTS | SUIVI  (mémorisé en localStorage)
                  └── grille d’icônes → pages module
```

Tab bar : **Bébé** (sections en accordéon : identité, objectifs, horoscope, alertes, journal ; **Noter une entrée** juste sous le journal) | bouton central (**Dashboard** = page d’accueil `/` ; depuis le dashboard → **Outils** `/tools` ; depuis un module → retour **Dashboard**) | **Profil** (accordéon : compte Google, co-parent, **gardien**, RGPD, légal).

Menu du bas en **position fixed**, **pleine largeur**. Les en-têtes de module (`←`) ramènent toujours au Dashboard. L’onglet Apports/Suivi sur Outils (et « Noter une entrée ») est un **curseur glissable** (doigt ou souris) **conservé** au retour depuis un module. Grille d’icônes sans fond, libellés gris comme le Dashboard.

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

- **App web** : **https://mimom.be/** (OVH VPS — front statique + API) — **PWA installable** (standalone)
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
| Allaitement | Une carte « Noter une tétée » + case **Minuteur** : sans case = notée immédiatement (Gauche ou Droit) ; avec case = démarre le timer sur ce sein. Pendant le chrono : **Gauche** et **Droit** restent tous deux cliquables (un seul sein à la fois) ; le chrono de séance continue, l’autre sein se met en pause et reprend au tap. Pas de bouton « Les deux » à la saisie ; si les deux seins ont servi, le journal affiche **Les deux** + durée totale. |
| Biberon | Type + heure + **quantité ml obligatoire**. Peut consommer du **stock** de lait tiré. |
| Diversification | Aliment + timestamp immédiat. |
| Compléments | Vitamine D / fer / autre, timestamp immédiat. Pas un conseil médical. |

Sur **Bébé**, le bouton **Noter une entrée** (formulaire intelligent Apports | Suivi) est placé juste sous le journal. Case **Minuteur** cochée par défaut sur tétée pour démarrer le timer. Les modules Outils gardent le flux 1 tap dédié.

### Suivi

| Module | Rôle |
|---|---|
| Couche | Un appui = pipi, caca ou les deux. |
| Tire-lait | Quantité + date → **stock** (`remainingMl`). Consommé via Biberon lait maternel. |
| Croissance | Poids (kg), taille (cm), périmètre crânien (cm). Courbes poids/taille et IMC indicatif (pas un avis médical). |
| Sommeil | Start / stop, durée depuis `startedAt` / `endedAt`. |
| Température | Saisie °C uniquement ; code couleur indicatif (vert / orange / rouge). |
| Notes | Texte libre. Case **À faire** = rappel sur le dashboard (accordéon Notes : liste complète, tap pour marquer fait ; dans le journal, classée à la date `doneAt` avec libellé « fait » ; réouvrable depuis le journal). |

### Rappels repas

Règle après le dernier repas (tétée terminée ou biberon) : aucun / 1 h / 2 h / 3 h / 4 h / personnalisé (objectif Bébé + module Allaitement, même `delayMinutes`). Notification navigateur si l’onglet reste ouvert.

## Dashboard

Périodes : Aujourd’hui | 7 jours | 30 jours | Tout (curseur glissable, **collé en haut** au défilement, même contrôle qu’Apports/Suivi).

Cartes **Favoris** (si configurés, sinon **+** / select pour en ajouter) : raccourcis vers les outils épinglés depuis chaque module (cœur à droite du titre). **Accordéon Notes** puis **Alertes** repas / sommeil / couche. Notes filtrées par période (todos ouvertes toujours visibles ; todos faites selon `doneAt`). Puis **Apports** : biberon, diversification, compléments (une ligne par indicateur avec bouton **+**). Puis **Suivi** : couches, sommeil, tire-lait (stock et tiré sur la période), poids/taille/PC, temp. (même format liste avec **+**). **Graphiques** : repas (total par jour), sommeil, couches, **poids et taille** (courbes, IMC indicatif vert / orange / rouge — pas un avis médical). **Entrées de la période** : journal synthétique en bas de page (avatar Google à droite si l’auteur est connu).

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
- Session : `POST /session` (échange jeton Google → session Abel 90 j) ; `DELETE /session` (déconnexion)
- Suppression compte : `DELETE /account` (auth, soft-delete toutes les données liées)
- Auth : Google Identity Services pour se connecter ; le VPS échange le jeton Google (1 h) contre une **session Abel** (`POST /session`, 90 jours glissants). `DELETE /session` à la déconnexion.
- **Source de vérité** : PostgreSQL sur le VPS quand Google est connecté. IndexedDB = cache hors ligne.
- `GET /sync` : télécharge le snapshot complet ; `POST /sync` : envoie les modifications en attente puis renvoie le snapshot.
- **Co-parent** : `GET /sharing`, `POST /invites` (`role: member`), `POST /invites/:id/accept|decline`, `DELETE /invites/:id` — invitation par e-mail Google, acceptation dans Profil, accès sync identique (1 propriétaire + 1 co-parent max).
- Photo Google : `POST /profile` (nom + photo du compte connecté) pour que Co-parent et le journal voient le même avatar.
- **Gardien** : même API avec `role: guardian` (jusqu’à 5) ; `DELETE /members/:userId` pour révoquer. Le gardien note les entrées, ne peut pas modifier identité / objectifs (`babies`, `reminderRules` ignorés au `POST /sync`).
- Au démarrage (session Google + réseau) : pull VPS avant de créer un bébé vide local. Profil : boutons **Synchroniser maintenant** / **Récupérer depuis le VPS** seulement si la sync a échoué, est hors ligne ou limitée.
- Un bébé par compte Google ; un profil vide local ne remplace pas les données serveur.
- Offline-first : saisie locale immédiate, envoi dès réseau + session Google. Un **pull** VPS n’écrase ni ne supprime une ligne `pending` (chrono / couche notés hors ligne).
- **Co-parent temps réel (onglet ouvert)** : push auto ~2 s après chaque changement (~0,6 s pour start/stop chrono) ; au retour d’onglet et toutes les 20 s : **push d’abord** s’il y a du pending, sinon pull, pour que l’autre parent voie tétée/sommeil/tire-lait en cours.

Déploiement : `GOOGLE_CLIENT_ID=... deploy/bootstrap-vps.sh` sur le VPS (clone `/opt/abel`, Postgres, PM2, Nginx). Snippet : `deploy/nginx-abel.conf.example` (déclarer `limit_req_zone` dans `http {}`).

La session Abel est stockée localement (pas le jeton Google, trop court). Sans session valide, l’app continue hors ligne. Sur Profil : rien d’alarmant si la sync est OK ; bouton Google de reconnexion seulement si la session a expiré (90 jours sans usage) ou a été révoquée.

## Légal et confidentialité

Pages accessibles depuis **Profil** ou `/legal/*` :

- **Mentions légales** — éditeur, hébergeurs (GitHub Pages + OVH).
- **Politique de confidentialité** — RGPD, finalités, droits, export/suppression.
- **CGU** — conditions d’utilisation.
- **Avertissement santé** — pas un dispositif médical.

Bandeau de consentement à la première visite (stockage local). Connexion Google = acceptation explicite de la sync vers le VPS.

**Profil** : export JSON, effacement local, `DELETE /account` (propriétaire = suppression bébé pour tous ; co-parent ou gardien = quitter le partage). Accordéon **Co-parent** : inviter par e-mail, accepter/refuser les invitations reçues ; liste des personnes avec accès (nom, e-mail Google, photo). Accordéon **Gardien** : inviter un compte Google qui ne peut que noter des entrées (pas modifier la fiche Bébé) ; propriétaire et co-parent peuvent révoquer un gardien.

## Co-parent

- Invitation depuis **Profil → Co-parent** par l’e-mail Google du co-parent (valable 7 jours).
- L’invité voit l’invitation dans son **Profil** (badge sur l’onglet) une fois connecté avec ce compte.
- La section Co-parent affiche le **profil** de chaque personne (nom, e-mail, photo Google).
- **Droits égaux** : saisie, sync, lecture pour les deux (1 propriétaire + 1 co-parent max).
- Tables VPS : `baby_members`, `baby_invites`, `auth_sessions`, `user_profiles` ; accès sync via membership, pas seulement `babies.user_id`.

## Gardien

- Invitation depuis **Profil → Gardien** par l’e-mail Google (valable 7 jours), par le **propriétaire ou le co-parent** (jusqu’à 5 gardiens).
- L’invité accepte dans **Profil**. Même sync que le co-parent pour les **entrées** (tétées, couches, etc.).
- **Pas de modification** de la fiche Bébé (identité, photo, date de naissance, objectifs / rappels). Lecture seule sur Identité et Objectifs ; le réglage rappel du module Allaitement est masqué.
- Peut quitter via RGPD ; le propriétaire ou le co-parent peut le retirer.
- Journal : chaque nouvelle entrée porte `createdBy` (compte Google) ; avatar à droite de la ligne (Bébé et dashboard). L’historique ancien reste sans auteur.

## Sécurité

- API en écoute `127.0.0.1` uniquement, derrière Nginx HTTPS.
- CORS restreint aux origines Abel.
- Auth Google obligatoire pour `/session` (création), `/sync`, `/sharing`, `/profile`, `/invites`, `/members` et `DELETE /account`. `DELETE /session` révoque le jeton présenté.
- Rate limiting API (`/horoscope`, `/sync`, `/sharing`, `/invites`, `/account`, `/session`) + Nginx `limit_req`.
- En-têtes : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `HSTS` (nginx).
- `VITE_GOOGLE_CLIENT_ID` via secrets — pas de Client ID en dur dans le code.
- Pas de cookies de traçage tiers.

## Stack

| Besoin | Choix |
|---|---|
| App | React 19 + Vite (TypeScript) + PWA (`vite-plugin-pwa`) |
| UI | CSS, mobile-first, lucide-react |
| Local | IndexedDB via Dexie |
| Routing | react-router HashRouter (GitHub Pages) |
| Auth | Google Identity Services |
| Hébergement | OVH VPS (mimom.be) + miroir GitHub Pages |
| Sync | VPS OVH `vps-e09ed6db.vps.ovh.net` (Node + Postgres) |
| Backend | VPS OVH uniquement |

Pas d’app native Expo. Pas de Next.js pour la V1 web.

## PWA

Mimom est une **Progressive Web App** installable (standalone), en plus du fonctionnement navigateur déjà offline-first (IndexedDB / Dexie). Le Service Worker ne stocke **pas** les données métier ni les jetons : il ne met en cache que la coquille (HTML/JS/CSS/icônes).

### Manifest

Généré au build par `vite-plugin-pwa` (`manifest.webmanifest`) selon `VITE_BASE_PATH` :

- **mimom.be** (`VITE_BASE_PATH=/`) : `start_url` / `scope` = `/`
- **GitHub Pages** (`VITE_BASE_PATH=/abel/`) : `start_url` / `scope` = `/abel/`
- Local : `npm run dev` → `http://localhost:5173/abel/` (SW **désactivé** en dev)

`display: standalone`, `orientation: portrait`, `theme_color` `#C45C4A`, `background_color` `#F6F1EA`. Icônes existantes : `favicon-192.png` (192) et `logo.png` / `apple-touch-icon.png` (512), `any` + `maskable`.

Au lancement (avant JS puis pendant IndexedDB / sync) : écran crème, **logo Mimom centré** avec un **anneau de chargement** (dans `index.html`, retiré quand `ready`).

### Service Worker

Fichier `sw.js` (Workbox, `generateSW`) :

| Ressource | Stratégie |
|---|---|
| JS / CSS / HTML / icônes (précache, hashés) | cache-first |
| Navigation SPA | `index.html` en repli **hors** `/api/` |
| `/api/` (sync, session, sharing, invites, account, horoscope) | **NetworkOnly** — jamais en cache |
| Google Identity (`accounts.google.com`, gstatic, googleapis) | **NetworkOnly** |

`skipWaiting` / `clientsClaim` **off** : une nouvelle version s’active au prochain lancement, sans recharger pendant une tétée ou un sommeil en cours. IndexedDB n’est jamais vidé par une MAJ du SW.

### Installation

- **Android / Chrome / Edge** : icône d’installation du navigateur (pas de bouton factice).
- **iOS Safari** : Partager → Sur l’écran d’accueil. Aide discrète dans **Profil → Sync et hors ligne** si on n’est pas déjà en standalone.
- **Ordinateur** : installer depuis Chrome / Edge (HTTPS).

### Hors ligne

Saisie = IndexedDB immédiat (inchangé). Le SW permet d’**ouvrir** l’app sans réseau. La sync reprend dès que le réseau et la session Abel sont là.

### Limitations iOS

- Pas de `beforeinstallprompt` : uniquement « Sur l’écran d’accueil ».
- Notifications : comme aujourd’hui, tant que l’app/PWA est ouverte (pas de push APNs).
- GIS : la connexion Google peut être plus capricieuse en standalone ; la **session Abel** (90 j) évite de se reconnecter à chaque ouverture.
- SW : iOS 16.4+ est fiable ; versions plus anciennes : Add to Home Screen sans cache SW complet.

### Test

1. `npm run build` puis `npm run preview` (ou déploiement mimom.be).
2. Chrome DevTools → Application → Manifest + Service Workers.
3. Mode airplane : recharger l’app installée, noter une couche, revenir en ligne, sync.
4. iPhone : Safari → écran d’accueil → lancement sans barre d’adresse.

Nginx (mimom.be) : `sw.js` et `manifest.webmanifest` en `Cache-Control: no-cache` (voir `deploy/nginx-mimom.be.conf.example`).

### Google Play (TWA, optionnel)

Enveloppe Android autour du site, **pas** une réécriture native. Guide : [`store/android/README.md`](store/android/README.md).

- Package : **`be.mimom.twa`** (PWABuilder, septembre 2026)
- AAB / APK : zip Play (copie locale gitignorée `store/android/Mimom.aab`)
- Digital Asset Links : `https://mimom.be/.well-known/assetlinks.json` (empreinte PWABuilder déjà dedans ; ajouter le SHA-256 **Play App Signing** avec `store/android/set-fingerprint.sh`)
- Keystore : **hors git** (`signing.keystore` + `signing-key-info.txt` du zip Play)
- Compte Play : 25 $ une fois, upload `.aab`
- Les mises à jour de mimom.be se voient sans republier l’AAB
- **App Store Apple** : hors périmètre (zip iOS PWABuilder = projet Xcode `be.mimom`, souvent refusé)

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

Chaque table métier : `id` UUID, `babyId`, timestamps UTC, `deletedAt` (soft delete), `syncStatus`. Les entrées (sauf `babies` / `reminder_rules` / segments) ont `createdBy` (Google `sub`) à la création.

Page **Bébé** : sections en **accordéon** (un seul panneau ouvert à la fois), identité et objectifs en lecture une fois renseignés (bouton Modifier ; un **gardien** n’a pas Modifier). Journal chronologique éditable filtré par **jour** (aujourd’hui par défaut) et par type d’entrée (tri sur l’heure de fin pour tétées, sommeil et tire-lait chronométré), **avatar** du compte à droite si l’auteur est connu. Édition journal : tétée (sein Gauche/Droit, **Les deux** si les deux seins ont servi pendant la séance, état, **date + heures de début et de fin** : changer l’une recalcule la durée ; saisir la durée décale la fin ; sieste qui dépasse minuit = fin le lendemain), sommeil (même logique), biberon/tire-lait (ml, début/fin/durée tire-lait), couche, diversification, complément, température, mesures, notes.

## Conventions agent

- Répondre **en français**.
- Mettre à jour **ce fichier** après chaque changement structurel.
- Ne pas inventer de conseils médicaux.
- 1 tap = 1 donnée.
- Dates UTC en base.
- Ne pas committer sauf demande explicite.
- Abel n’utilise que le VPS OVH `vps-e09ed6db.vps.ovh.net` (quand un backend existera). Aucun autre serveur.
