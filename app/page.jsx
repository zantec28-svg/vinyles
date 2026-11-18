import "./vinyles.css";
import { redirect } from "next/navigation";
import { estConnecte } from "@/lib/session";
import { lireVinyles } from "@/lib/vinyles";
import Vinyles from "./Vinyles";

export default async function Page() {
  if (!(await estConnecte())) redirect("/connexion");
  return <Vinyles data={await lireVinyles()} />;
}
