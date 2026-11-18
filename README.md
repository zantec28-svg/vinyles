# Mes vinyles

Suivi de ma collection de vinyles : on scanne le code-barres (ou on cherche l'album par
son nom) et l'artiste, le titre, l'année et la pochette se remplissent tout seuls,
gratuitement, grâce à Discogs et MusicBrainz. La collection est visible par tous ; un code
d'accès est demandé pour la modifier. Next.js, hébergé sur Vercel.

```bash
npm install
npm run dev
```

Variables d’environnement (Vercel → Settings → Environment Variables) :

- `APP_PIN` : code d’accès pour modifier la collection.
- `GITHUB_TOKEN` : jeton fine-grained limité à ce dépôt (Contents: Read and write), pour enregistrer la collection.
- `DISCOGS_TOKEN` : jeton personnel Discogs (gratuit, discogs.com → Settings → Developers), pour reconnaître les codes-barres des vinyles.
