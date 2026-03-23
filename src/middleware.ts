import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ROUTE_ACCESS } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/invite", "/api/auth"];

export default auth((req) => {
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

  // Redirect unauthenticated users to login
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check route-level RBAC
  const userRole = req.auth.user.role as Role;
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
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
