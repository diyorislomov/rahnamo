import { redirect } from "next/navigation";

export default function LegacyResourcesPage(): never {
  redirect("/mentors");
}
