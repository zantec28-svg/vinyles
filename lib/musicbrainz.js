import "server-only";

// Reconnaissance gratuite des vinyles avec MusicBrainz (base musicale libre,
// sans clé d'API) et Cover Art Archive (pochettes).
// MusicBrainz limite à ~1 requête par seconde : on espace les appels.

const UA = "mes-vinyles/1.0 (application personnelle de collection)";
let dernier = 0;

async function mb(chemin) {
  const attente = dernier + 1100 - Date.now();
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));
  dernier = Date.now();
  const sep = chemin.includes("?") ? "&" : "?";
  const r = await fetch(`https://musicbrainz.org/ws/2/${chemin}${sep}fmt=json`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  }).catch(() => {
    throw new Error("MusicBrainz est injoignable pour le moment, réessaie plus tard.");
  });
  if (r.status === 503) throw new Error("MusicBrainz est surchargé, réessaie dans quelques secondes.");
  if (!r.ok) throw new Error(`MusicBrainz ne répond pas (${r.status}).`);
  return r.json();
}

// Pochette : celle de l'édition exacte si elle existe, sinon celle de l'album.
async function pochette(releaseId, groupeId) {
  const essais = [
    releaseId && `https://coverartarchive.org/release/${releaseId}/front-500`,
    groupeId && `https://coverartarchive.org/release-group/${groupeId}/front-500`,
  ].filter(Boolean);
  for (const url of essais) {
    const ok = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) })
      .then((x) => x.ok).catch(() => false);
    if (ok) return url;
  }
  return "";
}

const GENRES = [
  ["Bande originale", /soundtrack|score|musical/],
  ["Chanson française", /chanson|french|variété/],
  ["Metal", /metal/],
  ["Hip-hop", /hip hop|hip-hop|rap|trap/],
  ["Reggae", /reggae|ska|dub|dancehall/],
  ["Jazz", /jazz|swing|bebop|bossa/],
  ["Blues", /blues/],
  ["Soul/Funk", /soul|funk|r&b|rhythm and blues|disco|gospel|motown/],
  ["Électro", /electro|house|techno|trance|ambient|synth|dance|downtempo|trip hop|edm|drum and bass/],
  ["Classique", /classical|baroque|opera|orchestral|symphon/],
  ["Folk", /folk|country|bluegrass|americana/],
  ["Pop", /pop/],
  ["Rock", /rock|punk|grunge|indie|alternative|new wave|psychedelic|shoegaze/],
];

// Genres MusicBrainz (anglais, avec nombre de votes) -> un genre de la liste.
function genre(liste = []) {
  const tries = [...liste].sort((a, b) => (b.count || 0) - (a.count || 0));
  for (const g of tries) {
    const trouve = GENRES.find(([, re]) => re.test(g.name.toLowerCase()));
    if (trouve) return trouve[0];
  }
  return "";
}

const artiste = (credits = []) => credits.map((c) => c.name + (c.joinphrase || "")).join("").trim();

// Détails complets d'un album (release-group), avec l'édition `release` si connue.
async function details(groupeId, release) {
  const g = await mb(`release-group/${groupeId}?inc=genres+tags+artist-credits`);
  if (!release) {
    const r = await mb(`release/?query=${encodeURIComponent(`rgid:${groupeId}`)}&limit=5`);
    release = (r.releases || []).find((x) => x["label-info"]?.length) || r.releases?.[0];
  }
  return {
    artiste: artiste(g["artist-credit"]) || artiste(release?.["artist-credit"]),
    titre: g.title,
    annee: (g["first-release-date"] || release?.date || "").slice(0, 4),
    label: release?.["label-info"]?.find((l) => l.label?.name)?.label.name || "",
    genre: genre(g.genres?.length ? g.genres : g.tags),
    mbid: groupeId,
    pochette: await pochette(release?.id, groupeId),
  };
}

// Code-barres (EAN-13 / UPC) imprimé au dos du vinyle -> album.
export async function parCodeBarres(ean) {
  // Un UPC (12 chiffres) est parfois lu ou enregistré avec un 0 devant (EAN-13)
  const formes = new Set([ean, ean.replace(/^0(\d{12})$/, "$1"), ean.length === 12 ? "0" + ean : ean]);
  const q = [...formes].map((f) => `barcode:${f}`).join(" OR ");
  const r = await mb(`release/?query=${encodeURIComponent(q)}&limit=10`);
  const editions = r.releases || [];
  // De préférence l'édition vinyle
  const rel = editions.find((x) => (x.media || []).some((m) => /vinyl/i.test(m.format || ""))) || editions[0];
  if (!rel?.["release-group"]?.id) return null;
  return details(rel["release-group"].id, rel);
}

// Recherche par artiste et/ou titre -> quelques albums au choix.
export async function rechercher(nomArtiste, titre) {
  const echap = (s) => `"${s.replace(/(["\\])/g, "\\$1")}"`;
  const q = [titre && `releasegroup:${echap(titre)}`, nomArtiste && `artist:${echap(nomArtiste)}`].filter(Boolean).join(" AND ");
  const r = await mb(`release-group/?query=${encodeURIComponent(q)}&limit=15`);
  const ordre = { Album: 0, EP: 1, Single: 2 };
  return (r["release-groups"] || [])
    .filter((g) => g.score >= 60)
    .sort((a, b) => (ordre[a["primary-type"]] ?? 3) - (ordre[b["primary-type"]] ?? 3) || b.score - a.score)
    .slice(0, 8)
    .map((g) => ({
      mbid: g.id,
      titre: g.title,
      artiste: artiste(g["artist-credit"]),
      annee: (g["first-release-date"] || "").slice(0, 4),
      type: g["primary-type"] || "",
      vignette: `https://coverartarchive.org/release-group/${g.id}/front-250`,
    }));
}

export function parIdentifiant(groupeId) {
  return details(groupeId, null);
}
