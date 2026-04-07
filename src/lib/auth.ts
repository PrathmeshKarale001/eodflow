import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { cache } from "react";

export const authApi = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
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
  },
});

// Backwards compatibility layer for legacy NextAuth "await auth()" usage
// Wrapped with React cache() to deduplicate across components in the same render pass
// (layout.tsx → navbar.tsx → dashboard/layout.tsx all call auth() — now only 1 DB hit)
export const auth = cache(async () => {
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
      role: sessionData.user.role,
      department: sessionData.user.department,
      image: sessionData.user.image,
    }
  };
});
