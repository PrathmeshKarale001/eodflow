import { redirect } from "next/navigation";

// The /accept-invite page has been replaced by /join (closed-invite system).
// Redirect any old bookmarks to the login page.
export default function AcceptInvitePage() {
  redirect("/login");
}
