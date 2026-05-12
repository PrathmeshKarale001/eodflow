import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

// signUp is intentionally NOT exported — registration is invite-only.
// All account creation goes through server actions (invitations.ts).
export const { signIn, signOut, useSession } = authClient;
