# Mimom — dossier Google Play

Tout ce qu’il faut pour l’écran **Créer une application** et la suite. Compte développeur déjà accepté (Vincent Hakou).

Package Android : **`be.mimom.twa`** (défini par le `.aab`, pas par le formulaire de création).
Fichier à envoyer : `store/android/Mimom.aab` (sur cette machine, gitignoré).

## Fichiers de ce dossier

| Fichier | Usage |
|---|---|
| `fiche.txt` | Nom, descriptions, catégorie, URLs |
| `data-safety.md` | Formulaire Sécurité des données |
| `questionnaires.md` | Pubs, âge, IARC, santé, etc. |
| `icon-512.png` | Icône fiche Play (512×512) |
| `feature-graphic.png` | Bannière 1024×500 (obligatoire) |
| `screenshots/` | Captures téléphone 9:16 (min. 2) |

## 1. Créer l’application

1. Play Console → **Créer une application**
2. Coller les champs de `fiche.txt` + déclarations de `questionnaires.md`
3. Valider

## 2. Fiche Play (présence sur la boutique)

**Développer la présence → Fiche Play principale**

1. Descriptions : `fiche.txt`
2. Icône : `icon-512.png`
3. Bannière : `feature-graphic.png`
4. Au moins **2 captures téléphone** : `screenshots/` (PNG 24 bits, pas de transparence)
5. Catégorie **Parentalité**

Ne pas mettre de vrai prénom / photo / mesures d’un enfant sur les captures.

## 3. Contenu de l’application

Ordre utile :

1. Politique de confidentialité → `https://mimom.be/privacy.html`
2. Publicité → Non
3. Public cible → 18+
4. Classification IARC
5. Sécurité des données (`data-safety.md`)
6. Accès à l’app → tout est testable sans compte
7. Santé → carnet, pas un dispositif médical
8. News / COVID / gouvernement / finance → Non

`privacy.html` doit être **en ligne** (déploiement VPS) avant d’envoyer le lien. Tant que ce n’est pas déployé, utiliser `https://mimom.be/#/legal/confidentialite`.

## 4. Premier envoi (.aab)

**Test et déploiement → Tests fermés** (pas seulement « test interne »).

Compte **personnel** créé après le 13 novembre 2023 : Google n’ouvre la **production** qu’après un **test fermé** avec **au moins 12 testeurs inscrits en continu pendant 14 jours**. Ensuite : Dashboard → demander l’accès production.

1. Créer une version sur la piste **Tests fermés**
2. Laisser **Play App Signing** (défaut)
3. Uploader `store/android/Mimom.aab` (`versionCode` 1, `versionName` 1.0.0.0, `targetSdk` 36)
4. Ajouter **15 à 20** adresses Gmail (marge si quelqu’un se désinscrit)
5. Envoyer le lien d’opt-in ; chaque testeur doit **ouvrir le lien**, accepter, **installer depuis Play**

Message type :

> Voici Mimom (carnet bébé) en test Play. Clique le lien, accepte d’être testeur, installe l’app, ouvre-la une fois. Merci de rester testeur **14 jours sans te désinscrire**.

Le test **interne** (jusqu’à 100 personnes, revue plus légère) est pratique pour toi, mais **ne compte pas** pour les 12 × 14 jours.

## 5. Digital Asset Links (barre d’adresse)

Après le **premier** upload :

1. Play Console → **Intégrité de l’app** → certificat de **signature** (SHA-256) — pas seulement la clé de téléchargement
2. Dans le repo :

```bash
bash store/android/set-fingerprint.sh "AB:CD:…:EF"
```

3. Déployer le front (`deploy/bootstrap-vps.sh`)
4. Vérifier [le générateur Google](https://developers.google.com/digital-asset-links/tools/generator) : domaine `mimom.be`, package `be.mimom.twa`

L’empreinte PWABuilder (APK sideload) est déjà dans `public/.well-known/assetlinks.json` :
`80:BB:BB:E2:9E:B2:0B:96:36:3E:BB:28:1F:1C:15:F2:1E:57:FD:F5:7D:4D:2A:33:59:E5:A9:4B:0D:2E:73:7E`

## 6. Production (après les 14 jours)

Dashboard → **Demander l’accès à la production**. Préparer 2–3 phrases :

- Qu’est-ce que Mimom (carnet hors ligne, 1 tap)
- Qui a testé (famille / proches, 12+ personnes, 14 jours)
- Ce qui a été corrigé grâce aux retours
- Prêt : pas de pub, confidentialité en ligne, pas un dispositif médical

Puis piste **Production** → même `.aab` (ou une version suivante). Les MAJ du site mimom.be **ne demandent pas** un nouvel AAB.

## Ne pas committer

`signing.keystore`, `signing-key-info.txt`, `.aab`, `.apk` — déjà gitignorés. Les garder hors git : sans le keystore, impossible de signer une v2.
