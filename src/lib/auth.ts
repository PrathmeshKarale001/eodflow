import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { cache } from "react";

// Build the base URL from available env vars
// Vercel auto-sets VERCEL_URL (without protocol) on every deployment
// and VERCEL=1 when running inside Vercel's environment.
const getBaseURL = () => {
  const isVercel = !!process.env.VERCEL;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;

  // On Vercel, ignore localhost BETTER_AUTH_URL (stale env var)
  if (isVercel) {
    if (betterAuthUrl && !betterAuthUrl.includes("localhost")) {
      return betterAuthUrl; // e.g. https://flow.eod.media
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
  }

  // Local development
  if (betterAuthUrl) return betterAuthUrl;
  return "http://localhost:3000";
};

export const authApi = betterAuth({
  baseURL: getBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    // Local dev — include all common ports Next.js falls back to
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    // Production domains
    "https://flow.eod.media",
    "https://eod-flow.vercel.app",
    "https://*.vercel.app",
    // Dynamic: Vercel auto-sets VERCEL_URL on every deployment
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    // Dynamic: Ensure the configured base URL is always trusted
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "EMPLOYEE",
      },
      department: {
        type: "string",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
      },
      invitedBy: {
        type: "string",
        required: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    // Block public sign-up: only allow sign-in for users that already exist
    // in the DB (created via our invitation server actions).
    // Better Auth's signUp.email() will fail with "User already exists" for
    // invited users (good) or create a ghost user for unknown emails.
    // The databaseHooks below catch and reject the ghost-user creation.
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if this user was pre-created by our invitation flow.
          // Invited users are already in the DB before they ever call signUp.
          // If Better Auth is trying to CREATE a new user (i.e. public signUp),
          // we reject it — only our server actions can create users.
          const existing = await db.user.findUnique({
            where: { email: user.email },
          });
          if (!existing) {
            // Not pre-created by invitation → block the sign-up
            return false;
          }
          // User exists (was created by invitation) → allow Better Auth
          // to proceed (it will link the account)
          return true;
        },
      },
    },
  },
  rateLimit: {
    window: 60,   // 60 second window
    max: 100,     // 100 requests per window (default is 10)
  },
  advanced: {
    // Use consistent cookie name regardless of HTTP/HTTPS
    // Production HTTPS would prefix with __Secure- which breaks server reads
    cookiePrefix: "eod-flow",
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});

export const auth = cache(async () => {
  try {
    const reqHeaders = await headers();
    const sessionData = await authApi.api.getSession({
      headers: reqHeaders,
    });
    
    if (!sessionData) return null;
    
    return {
      user: {
        id: sessionData.user.id,
        name: sessionData.user.name,
        email: sessionData.user.email,
        role: (sessionData.user as any).role,
        department: (sessionData.user as any).department,
        image: sessionData.user.image,
      }
    };
  } catch (error) {
    console.error("# AUTH_ERROR:", error);
    return null;
  }
});
