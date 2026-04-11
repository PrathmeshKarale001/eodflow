import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// LIGHTWEIGHT MIDDLEWARE — No network calls, no cold starts
//
// Better-Auth uses opaque session tokens (not JWTs), so we CANNOT verify them
// cryptographically in Edge middleware. Instead:
//   1. Middleware: Check if session cookie EXISTS → redirect to /login if missing
//   2. Page-level: auth() in dashboard/layout.tsx does the REAL DB verification
//   3. Action-level: Every server action independently calls auth() + hasPermission()
//
// This eliminates the 2-4 second self-fetch cold start on Vercel.
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = ["/", "/login", "/accept-invite", "/api/auth", "/api/debug-auth"];

// Must match the cookiePrefix set in auth.ts advanced config
const SESSION_COOKIE = "eod-flow.session_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => path === "/" ? pathname === "/" : pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if session cookie exists (no network call — just reads the cookie header)
  const sessionCookie = req.cookies.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC is handled at page-level (dashboard/layout.tsx checks auth() + role)
  // and action-level (every server action checks hasPermission())
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
