# Data safety (Play Console)

Chemin : **Contenu de l’application → Sécurité des données**.

Mimom envoie des données hors de l’appareil **seulement** si l’utilisateur se connecte avec Google (sync VPS) ou ajoute des photos d’album. Sans compte Google, tout reste dans IndexedDB. Play demande de déclarer aussi les fonctions **optionnelles**.

## Vue d’ensemble

| Question | Réponse |
|---|---|
| L’app collecte-t-elle des données utilisateur ? | **Oui** |
| Toutes les données collectées sont-elles chiffrées en transit ? | **Oui** (HTTPS) |
| Les utilisateurs peuvent-ils demander la suppression des données ? | **Oui** (Profil : export, effacement local, suppression compte / quitter le partage) |
| Revue de sécurité indépendante ? | **Non** |
| L’app respecte-t-elle la [famille de règles Play](https://support.google.com/googleplay/android-developer/answer/10787469) ? | Oui — pas de vente, pas de pub |

**Partage** (au sens Play : transfert à un **tiers**) : **Non**.
Le co-parent / gardien est un **partage initié par l’utilisateur** (invitation), à ne pas cocher comme « partage à un tiers ».
Google Identity Services = prestataire d’authentification, pas un partage publicitaire.

**Vente de données** : Non.
**Pub / suivi publicitaire** : Non. Mimom n’affiche pas de publicité.

## Types de données à cocher

Tout est **collecté** (optionnel), **pas partagé** (Play), finalité **Fonctionnalités de l’application**.

### Infos personnelles

| Type | Collecté | Obligatoire | Usage |
|---|---|---|---|
| Nom | Oui (nom du compte Google ; prénom du bébé) | Non | Fonctionnalités |
| Adresse e-mail | Oui (compte Google ; invitations) | Non | Fonctionnalités |
| Identifiants utilisateur | Oui (Google `sub`, session Abel) | Non | Fonctionnalités |
| Date de naissance | Oui (bébé, `bornOn`) | Non | Fonctionnalités (âge, horoscope) |

Ne pas cocher : adresse physique, téléphone, race/ethnie, orientation, opinions politiques, etc.

### Santé et fitness

| Type | Collecté | Obligatoire | Usage |
|---|---|---|---|
| Infos de santé | Oui (température, croissance, tétées, biberons, couches, sommeil, compléments — carnet, pas un dossier médical) | Non | Fonctionnalités |

Ne pas cocher « Infos sur la forme physique » sauf si Play n’a que ce libellé pour le sommeil : dans ce cas, **Infos de santé** suffit.

### Photos et vidéos

| Type | Collecté | Obligatoire | Usage |
|---|---|---|---|
| Photos | Oui (photo de profil bébé ; album chiffré sur le VPS) | Non | Fonctionnalités |

Pas de vidéos.

### Activité dans l’app

| Type | Collecté | Obligatoire | Usage |
|---|---|---|---|
| Autres contenus générés par l’utilisateur | Oui (notes, intitulés d’exercices, aliments saisis) | Non | Fonctionnalités |

Pas d’historique de recherche Play, pas de journaux de crash analytics tiers, pas d’interactions publicitaires.

### Identifiants de l’appareil

Ne pas cocher (pas d’ID publicitaire, pas de tracking SDK).

## Pour chaque type coché

- Collecté : **Oui**
- Partagé : **Non**
- Obligatoire / optionnel : **Optionnel** (l’app marche hors ligne sans compte)
- Finalités : **Fonctionnalités de l’application** uniquement
- Données éphémères : **Non** (elles sont stockées)
- Chiffré en transit : déjà répondu au niveau app

## Permission Android du .aab

Le package TWA déclare `POST_NOTIFICATIONS`. Les notifications Mimom ne partent que si l’app / l’onglet est ouvert (pas de FCM). Dans le formulaire Data safety, ne pas inventer une collecte liée aux notifs.
