import { redirect } from "next/navigation";

export default function RootPage() {
  // Siempre que alguien entre a "/", lo mandamos al login
  redirect("/login");
}
