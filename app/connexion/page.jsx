import "../vinyles.css";
import "./connexion.css";
import { redirect } from "next/navigation";
import { estConnecte } from "@/lib/session";
import Connexion from "./Connexion";

export const metadata = { title: "Connexion – Mes vinyles" };

export default async function Page() {
  if (await estConnecte()) redirect("/");
  return <Connexion />;
}
