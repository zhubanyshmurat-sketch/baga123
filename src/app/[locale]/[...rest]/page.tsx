import { notFound } from "next/navigation";

/** Any unknown path under a valid locale renders the localized 404 page inside the site layout. */
export default function CatchAll() {
  notFound();
}
