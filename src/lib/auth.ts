import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { cache } from "react";

// Build the base URL from available env vars
// Vercel auto-sets VERCEL_URL (without protocol) on every deployment
const getBaseURL = () => {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export const authApi = betterAuth({
  baseURL: getBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    "https://eod-flow.vercel.app",
    // Allow ALL Vercel preview/deployment URLs (they change every deploy)
    "https://*.vercel.app",
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
