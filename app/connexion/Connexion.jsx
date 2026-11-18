"use client";

import { useActionState } from "react";
import { connexion } from "./actions";

export default function Connexion() {
  const [etat, action, enCours] = useActionState(connexion, {});
  return (
    <div id="gate">
      <form className="gate-box" action={action}>
        <h2>Mes vinyles</h2>
        <p>Saisis ton mot de passe.</p>
        <input
          type="password"
          name="mdp"
          autoComplete="current-password"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          required
          aria-label="Mot de passe"
        />
        <button type="submit" disabled={enCours}>{enCours ? "Vérification…" : "Entrer"}</button>
        <p className="gate-error" role="alert">{etat?.erreur || ""}</p>
      </form>
    </div>
  );
}
