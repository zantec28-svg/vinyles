# Mes vinyles

Suivi de ma collection de vinyles : on prend la pochette en photo, l'artiste, le titre
et l'année se remplissent tout seuls. La collection est visible par tous ; un code
d'accès est demandé pour la modifier. Next.js, hébergé sur Vercel.

```bash
npm install
npm run dev
```

Variables d’environnement (Vercel → Settings → Environment Variables) :

- `APP_PIN` : code d’accès pour modifier la collection.
- `GITHUB_TOKEN` : jeton fine-grained limité à ce dépôt (Contents: Read and write), pour enregistrer la collection.
- `ANTHROPIC_API_KEY` : reconnaissance des pochettes par photo.
