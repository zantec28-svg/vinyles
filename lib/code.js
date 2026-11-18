import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Même modèle que le Pokédex : la collection est visible par tous, mais toute
// modification exige le code d'accès, variable d'environnement APP_PIN
// (réglages Vercel). Le code n'apparaît jamais dans le code source.
export function codeConfigure() {
  return Boolean(process.env.APP_PIN);
}

export function codeValide(saisi) {
  if (!codeConfigure()) return false;
  const h = (s) => createHash("sha256").update(String(s ?? "")).digest();
  return timingSafeEqual(h(saisi), h(process.env.APP_PIN));
}
