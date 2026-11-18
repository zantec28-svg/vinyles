"use server";

import { randomUUID } from "node:crypto";
import { codeConfigure, codeValide } from "@/lib/code";
import { discogsConfigure, parCodeBarresDiscogs, rechercherDiscogs } from "@/lib/discogs";
import { parCodeBarres, parIdentifiant, rechercher } from "@/lib/musicbrainz";
import { ajouterVinyle, ecritureConfiguree, modifierVinyle, supprimerVinyle } from "@/lib/vinyles";

const texte = (v, max = 200) => String(v ?? "").trim().slice(0, max);

// Vérifie le code d'accès envoyé avec la demande (null si tout va bien).
async function refus(code) {
  if (!codeConfigure()) return { erreur: "Modification non configurée sur le serveur (variable APP_PIN)." };
  if (codeValide(code)) return null;
  await new Promise((r) => setTimeout(r, 1000)); // ralentit les essais
  return { erreur: "Code incorrect : clique sur « Verrouiller » puis « Modifier » pour le ressaisir.", code: true };
}

// Bouton « Modifier » : le code est-il le bon ?
export async function verifierCode(code) {
  const r = await refus(code);
  return r ? { erreur: r.code ? "Code incorrect." : r.erreur } : { ok: true };
}

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const enErreur = (e) => ({ erreur: e.message || "Recherche impossible." });

// Code-barres scanné au dos du vinyle -> infos de l'album (MusicBrainz, gratuit).
export async function scanner(formData) {
  const r = await refus(formData.get("code"));
  if (r) return r;
  const ean = String(formData.get("ean") || "").replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(ean)) return { erreur: "Code-barres invalide." };
  // Discogs d'abord (meilleure base pour les vinyles) s'il est configuré, puis MusicBrainz.
  const sources = [
    ...(discogsConfigure() ? [["Discogs", parCodeBarresDiscogs]] : []),
    ["MusicBrainz", parCodeBarres],
  ];
  const erreurs = [];
  for (const [, fn] of sources) {
    try {
      const info = await fn(ean);
      if (info) return { ok: true, info, ean };
    } catch (e) {
      erreurs.push(e.message);
    }
  }
  if (erreurs.length === sources.length) return { erreur: erreurs.join(" ") };
  const noms = sources.map(([n]) => n).join(" ni de ");
  return { erreur: `Code-barres ${ean} inconnu de ${noms} : cherche l’album par son nom.` };
}

// Recherche par artiste et/ou titre -> liste d'albums au choix.
export async function chercher(formData) {
  const r = await refus(formData.get("code"));
  if (r) return r;
  const artiste = texte(formData.get("artiste"), 100);
  const titre = texte(formData.get("titre"), 100);
  if (!artiste && !titre) return { erreur: "Tape au moins l’artiste ou le titre." };
  const sources = [...(discogsConfigure() ? [rechercherDiscogs] : []), rechercher];
  const erreurs = [];
  for (const fn of sources) {
    try {
      const resultats = await fn(artiste, titre);
      if (resultats.length) return { ok: true, resultats };
    } catch (e) {
      erreurs.push(e.message);
    }
  }
  if (erreurs.length === sources.length) return { erreur: erreurs.join(" ") };
  return { erreur: "Aucun album trouvé : vérifie l’orthographe ou remplis les champs à la main." };
}

// Album choisi dans la liste -> infos complètes (année, label, genre, pochette).
export async function choisir(formData) {
  const r = await refus(formData.get("code"));
  if (r) return r;
  const mbid = String(formData.get("mbid") || "");
  if (!MBID.test(mbid)) return { erreur: "Album invalide." };
  try {
    return { ok: true, info: await parIdentifiant(mbid) };
  } catch (e) {
    return enErreur(e);
  }
}

// Ajout (sans id) ou modification (avec id) d'un vinyle.
export async function enregistrerVinyle(_etat, formData) {
  const r = await refus(formData.get("code"));
  if (r) return r;
  if (!ecritureConfiguree()) return { erreur: "Écriture non configurée sur le serveur (variable GITHUB_TOKEN)." };

  const pochette = texte(formData.get("pochette"), 60_000);
  const v = {
    artiste: texte(formData.get("artiste")),
    titre: texte(formData.get("titre")),
    annee: texte(formData.get("annee"), 4).replace(/\D/g, ""),
    label: texte(formData.get("label"), 120),
    genre: texte(formData.get("genre"), 60),
    notes: texte(formData.get("notes"), 500),
    // URL Cover Art Archive, ou petite vignette de la photo (data:image/jpeg)
    pochette: /^(https:\/\/coverartarchive\.org\/|https:\/\/i\.discogs\.com\/|data:image\/jpeg;base64,)/.test(pochette) ? pochette : "",
    mbid: texte(formData.get("mbid"), 40),
  };
  if (!v.artiste || !v.titre) return { erreur: "L’artiste et le titre sont obligatoires.", valeurs: v };

  try {
    const id = texte(formData.get("id"), 40);
    const data = id
      ? await modifierVinyle(id, v)
      : await ajouterVinyle({ id: randomUUID(), ...v, ajoute: new Date().toISOString().slice(0, 10) });
    return { ok: true, modif: Boolean(id), data, n: Date.now() };
  } catch (e) {
    return { erreur: e.message || "Enregistrement impossible.", valeurs: v };
  }
}

export async function retirerVinyle(id, code) {
  const r = await refus(code);
  if (r) return r;
  if (!ecritureConfiguree()) return { erreur: "Écriture non configurée sur le serveur (variable GITHUB_TOKEN)." };
  try {
    return { ok: true, data: await supprimerVinyle(texte(id, 40)) };
  } catch (e) {
    return { erreur: e.message || "Suppression impossible." };
  }
}
