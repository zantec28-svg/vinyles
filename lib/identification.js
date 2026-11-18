import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Reconnaissance d'une pochette de vinyle à partir d'une photo.
// 1. Claude (vision) lit la pochette et identifie l'album.
// 2. MusicBrainz confirme l'année de sortie originale et fournit la pochette
//    officielle (Cover Art Archive).
// Variable d'environnement (réglages Vercel) : ANTHROPIC_API_KEY.

export function identificationConfiguree() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SCHEMA = {
  type: "object",
  properties: {
    reconnu: { type: "boolean", description: "false si la photo ne montre pas une pochette identifiable" },
    artiste: { type: "string" },
    titre: { type: "string" },
    annee: { type: "string", description: "Année de sortie originale de l'album (AAAA), vide si inconnue" },
    label: { type: "string" },
    genre: { type: "string", description: "Genre principal, en français (Rock, Pop, Jazz, Hip-hop, Électro, Chanson française, Soul/Funk, Classique, Reggae, Metal, Blues, Folk, Autre…)" },
    confiance: { type: "string", enum: ["haute", "moyenne", "faible"] },
  },
  required: ["reconnu", "artiste", "titre", "annee", "label", "genre", "confiance"],
  additionalProperties: false,
};

const CONSIGNE = `Tu identifies des disques vinyles à partir d'une photo de leur pochette (recto, verso, ou étiquette du disque).
Lis le texte visible et utilise tes connaissances pour retrouver l'album exact.
Donne le nom de l'artiste et le titre de l'album tels qu'ils sont publiés (sans traduction), l'année de sortie originale de l'album, le label d'origine et le genre principal.
Si un champ n'est pas déterminable, laisse-le vide. Si la photo ne montre pas de disque identifiable, mets reconnu à false.`;

let client;
function claude() {
  client ??= new Anthropic();
  return client;
}

async function lirePochette(base64, mediaType) {
  const reponse = await claude().beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: CONSIGNE,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: "Identifie ce vinyle." },
      ],
    }],
  });
  if (reponse.stop_reason === "refusal") throw new Error("La reconnaissance a été refusée pour cette photo.");
  const texte = reponse.content.find((b) => b.type === "text")?.text;
  if (!texte) throw new Error("Réponse vide de la reconnaissance.");
  return JSON.parse(texte);
}

// Recherche l'album sur MusicBrainz (année originale + pochette officielle).
async function chercherMusicBrainz(artiste, titre) {
  const echap = (s) => s.replace(/(["\\])/g, "\\$1");
  const q = `releasegroup:"${echap(titre)}" AND artist:"${echap(artiste)}"`;
  const url = `https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=5&query=${encodeURIComponent(q)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "portail-vinyles/1.0 (usage personnel)", Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const { "release-groups": groupes = [] } = await r.json();
  const g = groupes.find((x) => x.score >= 90 && x["primary-type"] === "Album") || groupes.find((x) => x.score >= 90);
  if (!g) return null;
  // La pochette n'existe pas toujours : on vérifie avant de la proposer.
  const pochette = `https://coverartarchive.org/release-group/${g.id}/front-500`;
  const ok = await fetch(pochette, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) })
    .then((x) => x.ok).catch(() => false);
  return {
    mbid: g.id,
    annee: (g["first-release-date"] || "").slice(0, 4),
    pochette: ok ? pochette : "",
  };
}

export async function identifierVinyle(base64, mediaType) {
  const info = await lirePochette(base64, mediaType);
  if (!info.reconnu || !info.artiste || !info.titre) return { ...info, reconnu: false };
  const mb = await chercherMusicBrainz(info.artiste, info.titre).catch(() => null);
  return {
    ...info,
    annee: mb?.annee || info.annee,
    mbid: mb?.mbid || "",
    pochette: mb?.pochette || "",
  };
}
