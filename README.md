# Mes vinyles

Suivi de ma collection de vinyles : on prend la pochette en photo, l'artiste, le titre
et l'année se remplissent tout seuls. Next.js, hébergé sur Vercel.

```bash
npm install
npm run dev
```

Variables d’environnement (Vercel → Settings → Environment Variables) :

- `ACCES_MDP` : mot de passe de l’application.
- `GITHUB_TOKEN` : jeton fine-grained limité à ce dépôt (Contents: Read and write), pour enregistrer la collection.
- `ANTHROPIC_API_KEY` : reconnaissance des pochettes par photo.
