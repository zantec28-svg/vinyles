"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, DUREE_S, creerJeton, motDePasseConfigure, verifierMotDePasse } from "@/lib/session";

export async function connexion(_etat, formData) {
  if (!motDePasseConfigure()) {
    return { erreur: "Accès non configuré sur le serveur (variable ACCES_MDP)." };
  }
  if (!verifierMotDePasse(formData.get("mdp"))) {
    await new Promise((r) => setTimeout(r, 1000)); // ralentit les essais
    return { erreur: "Mot de passe incorrect." };
  }
  const store = await cookies();
  store.set(COOKIE, creerJeton(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_S,
  });
  redirect("/");
}

export async function deconnexion() {
  const store = await cookies();
  store.delete(COOKIE);
  redirect("/connexion");
}
