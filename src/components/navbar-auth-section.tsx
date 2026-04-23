"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Client component that handles the auth-dependent part of the navbar.
 * Extracted from the server Navbar to allow the root layout to be statically optimizable
 * (removes the need for `force-dynamic` on the root layout).
 *
 * Instead of calling auth() server-side in the Navbar (which forces dynamic rendering),
 * this component checks for the session cookie client-side to determine nav state.
 */
export function NavbarAuthSection() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for session cookie presence (same cookies as middleware.ts)
    const sessionCookies = [
      "eod-flow.session_token",
      "__Secure-eod-flow.session_token",
      "better-auth.session_token",
      "__Secure-better-auth.session_token",
    ];
    const hasCookie = sessionCookies.some((name) =>
      document.cookie.split(";").some((c) => c.trim().startsWith(`${name}=`))
    );
    setHasSession(hasCookie);
  }, []);

  // Render a skeleton placeholder during SSR/hydration to prevent CLS
  if (hasSession === null) {
    return (
      <div className="flex-1 h-full bg-primary-container/50 animate-pulse mono-clip" />
    );
  }

  if (hasSession) {
    return (
      <Link
        href="/overview"
        className="flex-1 h-full bg-primary-container text-on-primary-container font-headline text-sm uppercase font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center mono-clip"
      >
        DASHBOARD
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="flex-1 h-full bg-primary-container text-on-primary-container font-headline text-sm uppercase font-bold hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center mono-clip"
    >
      SIGN IN_SYS
    </Link>
  );
}
