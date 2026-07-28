import { redirect } from "next/navigation";
import { getDefaultLocationSlug, menuPath } from "@/lib/restaurants";

/** Legacy flat /menu → default location menu (server redirect for SEO). */
export default function MenuRedirectPage() {
  const slug = getDefaultLocationSlug();
  redirect(slug ? menuPath(slug) : "/");
}
