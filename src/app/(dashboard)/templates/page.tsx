import { redirect } from "next/navigation";

export const metadata = {
  title: "Plantillas | Lumacraft",
  description: "Las plantillas ahora viven dentro de cada colección.",
};

export default function TemplatesPage() {
  redirect("/collections");
}
