import "server-only";
import { genre } from "./genres";

// Discogs : la base de référence des vinyles (bien plus de codes-barres de
// pressages que MusicBrainz). Gratuit, mais l'API demande un jeton personnel :
// variable d'environnement DISCOGS_TOKEN (discogs.com → Settings → Developers).
// Limite : 60 requêtes par minute.

export function discogsConfigure() {
  return Boolean(process.env.DISCOGS_TOKEN);
}

async function api(chemin) {
  const r = await fetch(`https://api.discogs.com/${chemin}`, {
    headers: {
      "User-Agent": "mes-vinyles/1.0",
      Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  }).catch(() => {
    throw new Error("Discogs est injoignable pour le moment, réessaie plus tard.");
  });
  if (r.status === 401) throw new Error("Jeton Discogs refusé (variable DISCOGS_TOKEN).");
  if (r.status === 429) throw new Error("Trop de recherches Discogs d’un coup : attends une minute.");
  if (!r.ok) throw new Error(`Discogs ne répond pas (${r.status}).`);
  return r.json();
}

// « Nirvana (2) » -> « Nirvana », « Artiste* » -> « Artiste »
const nettoyer = (s = "") => s.replace(/\s*\(\d+\)$/, "").replace(/\*$/, "").trim();

// Un résultat de recherche Discogs (titre « Artiste - Album ») -> fiche vinyle.
function fiche(x, annee) {
  const i = x.title.indexOf(" - ");
  return {
    artiste: nettoyer(i > 0 ? x.title.slice(0, i) : ""),
    titre: (i > 0 ? x.title.slice(i + 3) : x.title).trim(),
    annee: String(annee || x.year || "").slice(0, 4),
    label: nettoyer(x.label?.[0]),
    genre: genre([...(x.style || []), ...(x.genre || [])].map((name) => ({ name }))),
    mbid: "",
    pochette: /^https:\/\/i\.discogs\.com\//.test(x.cover_image || "") && !/spacer\.gif/.test(x.cover_image) ? x.cover_image : "",
  };
}

// Année de sortie originale (celle de l'album « master », pas du pressage).
async function anneeOriginale(x) {
  if (!x.master_id) return x.year;
  const m = await api(`masters/${x.master_id}`).catch(() => null);
  return m?.year || x.year;
}

export async function parCodeBarresDiscogs(ean) {
  const formes = [...new Set([ean, ean.replace(/^0(\d{12})$/, "$1"), ean.length === 12 ? "0" + ean : ean])];
  for (const f of formes) {
    const r = await api(`database/search?type=release&per_page=10&barcode=${encodeURIComponent(f)}`);
    const liste = r.results || [];
    const x = liste.find((y) => (y.format || []).some((fm) => /vinyl|lp/i.test(fm))) || liste[0];
    if (x) return fiche(x, await anneeOriginale(x));
  }
  return null;
}

// Recherche par artiste et/ou titre : albums « master » (une entrée par album).
export async function rechercherDiscogs(artiste, titre) {
  const p = new URLSearchParams({ type: "master", per_page: "8" });
  if (artiste) p.set("artist", artiste);
  if (titre) p.set("release_title", titre);
  let r = await api(`database/search?${p}`);
  if (!r.results?.length) {
    // Recherche libre, plus tolérante (fautes, mots dans le désordre)
    r = await api(`database/search?type=master&per_page=8&q=${encodeURIComponent([artiste, titre].filter(Boolean).join(" "))}`);
  }
  return (r.results || []).map((x) => {
    const info = fiche(x);
    return {
      id: `discogs-${x.id}`,
      titre: info.titre,
      artiste: info.artiste,
      annee: info.annee,
      type: (x.format || []).slice(0, 2).join(" "),
      vignette: x.thumb || "",
      info,
    };
  });
}
