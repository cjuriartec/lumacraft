import { redirect } from "next/navigation";

export default function SettingsRedirectPage() {
  // Redirigir la base de settings temporalmente al dashboard
  redirect("/");
}
