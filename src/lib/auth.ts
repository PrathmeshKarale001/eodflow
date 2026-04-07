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
    getBaseURL(),
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
  },
});

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
      role: (sessionData.user as any).role,
      department: (sessionData.user as any).department,
      image: sessionData.user.image,
    }
  };
});
