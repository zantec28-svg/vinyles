# Mes vinyles

Application de suivi de ma collection de vinyles, en **Next.js (App Router, JavaScript)**,
hébergée sur Vercel. Même modèle que les portails du site pauwels.ovh (dépôt `site`).
Répondre à l'utilisateur en français.

- Développement : `npm install` puis `npm run dev` ; vérifier avec `npm run build`.
- Ne jamais mettre de secret dans le dépôt ni dans `public/`.
- Git : l'utilisateur autorise à pousser **directement sur `main`** (sans branche ni
  pull request). Chaque push sur `main` est mis en ligne par Vercel en ~1 min :
  vérifier avec `npm run build` avant de pousser.

## Organisation

- `app/page.jsx` : la collection, **visible par tous** (même modèle que le Pokédex).
- `app/Vinyles.jsx` : interface (liste, recherche, tri, filtres, formulaire). Le
  code-barres est lu **dans le navigateur** (détecteur intégré du téléphone, sinon ZXing).
- `app/actions.js` : actions serveur (vérification du code, scan, recherche,
  ajout/modification, suppression). **Chaque action commence par vérifier le code**
  (`refus(code)`) : un visiteur ne peut ni écrire ni solliciter MusicBrainz.
- `lib/code.js` : code d'accès, variable `APP_PIN`, comparé sur le serveur. Bouton
  « Modifier » → saisie du code → gardé dans le navigateur (`localStorage`) et envoyé
  avec chaque modification ; « Verrouiller » l'efface.
- `lib/musicbrainz.js` : reconnaissance **gratuite** (MusicBrainz, sans clé ; pochettes
  Cover Art Archive). Recherche par code-barres ou par artiste/titre. MusicBrainz limite
  à ~1 requête/s : les appels sont espacés. Ne pas ajouter de service payant.
- `lib/vinyles.js` + `lib/github.js` : lecture de `data/vinyles.json` et écriture par
  commit via l'API GitHub (le disque de Vercel est en lecture seule).

## Variables d'environnement (Vercel → Settings → Environment Variables)

- `APP_PIN` : code d'accès pour modifier la collection.
- `GITHUB_TOKEN` : jeton fine-grained limité au dépôt `vinyles`, Contents: Read and write.
- Facultatif : `GITHUB_REPO` (défaut `zantec28-svg/vinyles`), `GITHUB_BRANCH` (défaut `main`).

## Mettre à jour la collection (data/vinyles.json)

Depuis l'application : « Modifier » (code), « + Ajouter un vinyle », puis
« 📷 Scanner le code-barres » (photo du dos du vinyle) ou « 🔍 Chercher l'album »
(artiste et/ou titre, puis choix dans la liste). MusicBrainz fournit l'artiste, le titre,
l'année de sortie originale, le label, le genre et la pochette officielle. Les champs
restent modifiables avant d'enregistrer ; « Ma photo comme pochette » remplace la pochette.
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
