"use server";

import { randomUUID } from "node:crypto";
import { codeConfigure, codeValide } from "@/lib/code";
import { identificationConfiguree, identifierVinyle } from "@/lib/identification";
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

const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];

// Photo de la pochette (déjà réduite par le navigateur) -> infos de l'album.
export async function identifier(formData) {
  const r = await refus(formData.get("code"));
  if (r) return r;
  if (!identificationConfiguree()) return { erreur: "Reconnaissance non configurée sur le serveur (variable ANTHROPIC_API_KEY)." };
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(formData.get("photo") || ""));
  if (!m || !TYPES_IMAGE.includes(m[1])) return { erreur: "Photo invalide." };
  if (m[2].length > 5_000_000) return { erreur: "Photo trop lourde." };
  try {
    const info = await identifierVinyle(m[2], m[1]);
    if (!info.reconnu) return { erreur: "Pochette non reconnue : réessaie avec une photo plus nette, ou remplis les champs à la main." };
    return { ok: true, info };
  } catch (e) {
    return { erreur: e.message || "Reconnaissance impossible." };
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
    pochette: /^(https:\/\/coverartarchive\.org\/|data:image\/jpeg;base64,)/.test(pochette) ? pochette : "",
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
