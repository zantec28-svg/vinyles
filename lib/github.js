import "server-only";

// Écriture de fichiers du dépôt via l'API GitHub (le disque de Vercel est en
// lecture seule). Variables d'environnement (réglages Vercel) :
//   GITHUB_TOKEN  : jeton « fine-grained » limité à ce dépôt (vinyles), droit Contents: Read and write
//   GITHUB_REPO   : facultatif, « propriétaire/dépôt » (défaut zantec28-svg/vinyles)
//   GITHUB_BRANCH : facultatif (défaut main)
// Chaque commit déclenche un redéploiement Vercel (~1 min).
export function ecritureConfiguree() {
  return Boolean(process.env.GITHUB_TOKEN);
}

function api(chemin, options = {}) {
  const depot = process.env.GITHUB_REPO || "zantec28-svg/vinyles";
  return fetch(`https://api.github.com/repos/${depot}/contents/${chemin}`, {
    ...options,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

// Lit `chemin` sur GitHub (pas la copie du déploiement en cours, pour ne pas
// perdre un enregistrement fait juste avant pendant le redéploiement), applique
// `modifier(texte)` (peut être async, renvoie le nouveau texte) et commit.
export async function modifierFichierGitHub(chemin, modifier, message) {
  const branche = process.env.GITHUB_BRANCH || "main";
  const r = await api(`${chemin}?ref=${encodeURIComponent(branche)}`);
  if (!r.ok) throw new Error(`Lecture GitHub impossible (${r.status}).`);
  const { sha, content } = await r.json();
  const nouveau = await modifier(Buffer.from(content, "base64").toString("utf8"));
  const w = await api(chemin, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: Buffer.from(nouveau).toString("base64"), sha, branch: branche }),
  });
  if (!w.ok) throw new Error(w.status === 409 ? "Conflit d’écriture, réessaie." : `Écriture GitHub impossible (${w.status}).`);
  return nouveau;
}
