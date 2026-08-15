import { redirect } from "next/navigation";

/** Thai/rodizio page not used for Grill N Chill — send visitors to the location hub. */
export default function AllYouCanEatLunchRedirect() {
  redirect("/");
}
