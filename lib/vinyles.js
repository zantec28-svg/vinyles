import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { modifierFichierGitHub } from "./github";

export { ecritureConfiguree } from "./github";

// Collection de vinyles : data/vinyles.json (liste en clair, pas de donnée
// personnelle). Écriture via l'API GitHub (lib/github.js).
const FICHIER = "data/vinyles.json";

export async function lireVinyles() {
  return JSON.parse(await readFile(path.join(process.cwd(), FICHIER), "utf8"));
}

// Applique `modifier(liste)` à la version sur GitHub et commit. Renvoie la liste à jour.
async function modifierListe(modifier, message) {
  let liste;
  await modifierFichierGitHub(FICHIER, (contenu) => {
    liste = JSON.parse(contenu || "[]");
    modifier(liste);
    return JSON.stringify(liste, null, 2) + "\n";
  }, message);
  return liste;
}

const nom = (v) => `${v.artiste} – ${v.titre}`;

export function ajouterVinyle(vinyle) {
  return modifierListe((l) => l.push(vinyle), `Vinyles : ajout de ${nom(vinyle)} (depuis le site)`);
}

export function modifierVinyle(id, vinyle) {
  return modifierListe((l) => {
    const i = l.findIndex((v) => v.id === id);
    if (i < 0) throw new Error("Ce vinyle n’existe plus : recharge la page.");
    l[i] = { ...l[i], ...vinyle, id };
  }, `Vinyles : modification de ${nom(vinyle)} (depuis le site)`);
}

export function supprimerVinyle(id) {
  return modifierListe((l) => {
    const i = l.findIndex((v) => v.id === id);
    if (i < 0) throw new Error("Ce vinyle n’existe plus : recharge la page.");
    l.splice(i, 1);
  }, "Vinyles : suppression (depuis le site)");
}
