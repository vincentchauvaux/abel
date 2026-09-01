# Mimom sur Google Play (TWA)

Enveloppe **Trusted Web Activity** autour de [https://mimom.be/](https://mimom.be/). Pas d’Expo, pas de Capacitor : c’est le site, dans une coquille Android. Les mises à jour du site se voient sans republier l’app.

L’**App Store Apple** n’est pas couvert ici (le zip iOS PWABuilder est un projet Xcode WKWebView ; Apple le refuse souvent).

## PWA (déjà en ligne)

- HTTPS : `https://mimom.be/`
- Manifest : `https://mimom.be/manifest.webmanifest` (`display: standalone`, icônes 192/512, `theme_color` `#C45C4A`)
- Service Worker : `https://mimom.be/sw.js`
- Confidentialité (fiche Play) : `https://mimom.be/#/legal/confidentialite`

## Package PWABuilder (septembre 2026)

Téléchargé depuis [PWABuilder](https://www.pwabuilder.com/reportcard?site=https://mimom.be/) :

| Zip | Usage |
|---|---|
| `Mimom - Google Play package.zip` | **Celui qu’il faut** : `Mimom.aab` (Play), `Mimom.apk` (test téléphone), `assetlinks.json`, `signing.keystore` |
| `Mimom (windows).zip` | Microsoft Store / sideload MSIX — optionnel |
| `Mimom.zip` | Projet Xcode iOS (`be.mimom`) — hors périmètre App Store |

Package Android : **`be.mimom.twa`** (id PWABuilder, pas `be.mimom.app`).

**Sauvegarder hors git** le zip Play : `signing.keystore` + `signing-key-info.txt` sont indispensables pour signer les prochaines versions. Ne jamais les committer.

Copie locale gitignorée (cette machine) :

```text
store/android/Mimom.aab
store/android/Mimom.apk
store/android/signing.keystore
store/android/signing-key-info.txt
```

## 1. Compte développeur

1. [Google Play Console](https://play.google.com/console) — **25 $ une fois**.
2. Créer l’application **Mimom**, package **`be.mimom.twa`**.
3. Laisser **Play App Signing** activé (défaut).

## 2. Digital Asset Links (barre d’adresse)

Sans ce fichier, Chrome affiche l’URL en haut de l’app.

Fichier servi : `https://mimom.be/.well-known/assetlinks.json`  
Empreinte actuelle = **clé de téléchargement PWABuilder** (l’APK sideloadé).

Après le premier upload Play :

1. Play Console → **Intégrité de l’app** → **Signature de l’application**
2. Copier le **SHA-256 du certificat de signature** (pas seulement la clé de téléchargement)
3. Dans le repo :

```bash
bash store/android/set-fingerprint.sh "AB:CD:…:EF"
```

4. Déployer le front VPS (`deploy/bootstrap-vps.sh`).
5. Vérifier : [Digital Asset Links](https://developers.google.com/digital-asset-links/tools/generator) — domaine `mimom.be`, package `be.mimom.twa`.

## 3. Soumission Play Console

1. Uploader `store/android/Mimom.aab` (ou le `.aab` du zip)
2. Fiche : nom Mimom, description, icône, captures d’écran téléphone
3. Politique de confidentialité : `https://mimom.be/#/legal/confidentialite`
4. Catégorie (famille / style de vie), public, questionnaire contenu
5. Envoyer en **test interne** d’abord, puis production

Google est en général souple avec les TWA. Après publication, un changement sur mimom.be **n’exige pas** un nouvel `.aab` (sauf changement d’icône store, permissions, ou package).

Pour une nouvelle version store (icône, package) : reconstruire avec **le même** `signing.keystore`.

## Ce qui ne change pas

IndexedDB, sync VPS, session Abel, Google Identity. Taille de l’enveloppe ~1–5 Mo. Notifications : comme la PWA, tant que l’app est ouverte (pas de FCM).
