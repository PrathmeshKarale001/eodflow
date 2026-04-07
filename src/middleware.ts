import { NextResponse, type NextRequest } from "next/server";
import { ROUTE_ACCESS } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const PUBLIC_PATHS = ["/", "/login", "/accept-invite", "/api/auth", "/api/debug-auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => path === "/" ? pathname === "/" : pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static assets and API routes for auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Explicitly fetch the session from our Better-Auth endpoint.
  // This bypasses Node.js Edge limitations since prisma isn't edge-compatible.
  const response = await fetch(`${req.nextUrl.origin}/api/auth/get-session`, {
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
  });
  
  const authSession = await response.json().catch(() => null);

  // Redirect unauthenticated users to login
  if (!authSession?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check route-level RBAC
  const userRole = authSession.user.role as Role;
  const matchedRoute = Object.entries(ROUTE_ACCESS).find(([route]) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const [, allowedRoles] = matchedRoute;
    if (!allowedRoles.includes(userRole)) {
      // Redirect unauthorized users to their default dashboard
      return NextResponse.redirect(new URL("/overview", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
