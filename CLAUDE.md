# Mes vinyles

Application de suivi de ma collection de vinyles, en **Next.js (App Router, JavaScript)**,
hébergée sur Vercel. Même modèle que les portails du site pauwels.ovh (dépôt `site`).
Répondre à l'utilisateur en français.

- Développement : `npm install` puis `npm run dev` ; vérifier avec `npm run build`.
- Ne jamais mettre de secret dans le dépôt ni dans `public/`.

## Organisation

- `app/page.jsx` : la collection, **visible par tous** (même modèle que le Pokédex).
- `app/Vinyles.jsx` : interface (liste, recherche, tri, filtres, formulaire, photo).
- `app/actions.js` : actions serveur (vérification du code, reconnaissance,
  ajout/modification, suppression). **Chaque action qui modifie quelque chose ou
  appelle Claude commence par vérifier le code** (`refus(code)`).
- `lib/code.js` : code d'accès, variable `APP_PIN`, comparé sur le serveur. Bouton
  « Modifier » → saisie du code → gardé dans le navigateur (`localStorage`) et envoyé
  avec chaque modification ; « Verrouiller » l'efface.
- `lib/identification.js` : reconnaissance de la pochette (Claude, puis MusicBrainz).
- `lib/vinyles.js` + `lib/github.js` : lecture de `data/vinyles.json` et écriture par
  commit via l'API GitHub (le disque de Vercel est en lecture seule).

## Variables d'environnement (Vercel → Settings → Environment Variables)

- `APP_PIN` : code d'accès pour modifier la collection.
- `GITHUB_TOKEN` : jeton fine-grained limité au dépôt `vinyles`, Contents: Read and write.
- `ANTHROPIC_API_KEY` : reconnaissance des pochettes.
- Facultatif : `GITHUB_REPO` (défaut `zantec28-svg/vinyles`), `GITHUB_BRANCH` (défaut `main`).

## Mettre à jour la collection (data/vinyles.json)

Depuis l'application : « + Ajouter un vinyle », puis « 📷 Prendre en photo ».
La photo (réduite dans le navigateur) est envoyée à `identifier` : Claude lit la
pochette, puis MusicBrainz confirme l'année de sortie originale et fournit la pochette
officielle (Cover Art Archive). Les champs restent modifiables avant d'enregistrer.
Chaque enregistrement est un commit sur `main`, qui redéploie l'application (~1 min).

À la main : ajouter un objet dans `data/vinyles.json` :

```json
{
  "id": "uuid unique",
  "artiste": "Daft Punk",
  "titre": "Discovery",
  "annee": "2001",
  "label": "Virgin",
  "genre": "Électro",
  "notes": "",
  "pochette": "https://coverartarchive.org/release-group/<mbid>/front-500",
  "mbid": "",
  "ajoute": "2026-11-18"
}
```

- `pochette` : URL Cover Art Archive, petite vignette `data:image/jpeg;base64,…`, ou vide.
- `genre` : Rock, Pop, Jazz, Hip-hop, Électro, Chanson française, Soul/Funk, Classique,
  Reggae, Metal, Blues, Folk, Bande originale, Autre (texte libre accepté).
