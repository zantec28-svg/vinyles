import "./vinyles.css";
import { lireVinyles } from "@/lib/vinyles";
import Vinyles from "./Vinyles";

// Collection visible par tous ; les modifications demandent le code (APP_PIN).
export const dynamic = "force-dynamic";

export default async function Page() {
  return <Vinyles data={await lireVinyles()} />;
}
