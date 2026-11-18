import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Le mot de passe de l'espace personnel est la variable d'environnement
// ACCES_MDP (réglages Vercel). Il n'apparaît jamais dans le code.
export const COOKIE = "vinyles_session";
export const DUREE_S = 2 * 60 * 60; // 2 h

function motDePasse() {
  return process.env.ACCES_MDP || "";
}

export function motDePasseConfigure() {
  return motDePasse().length > 0;
}

function signer(valeur) {
  const cle = createHash("sha256").update("vinyles-session:" + motDePasse()).digest();
  return createHmac("sha256", cle).update(valeur).digest("base64url");
}

function egal(a, b) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifierMotDePasse(saisi) {
  return motDePasseConfigure() && egal(String(saisi || ""), motDePasse());
}

export function creerJeton() {
  const exp = String(Date.now() + DUREE_S * 1000);
  return `${exp}.${signer(exp)}`;
}

function jetonValide(jeton) {
  if (!motDePasseConfigure() || !jeton) return false;
  const [exp, sig] = String(jeton).split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return egal(sig, signer(exp));
}

export async function estConnecte() {
  const store = await cookies();
  return jetonValide(store.get(COOKIE)?.value);
}
