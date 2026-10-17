import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById, type PublicUser } from "@/lib/services/users";
import { SESSION_COOKIE, verifyToken } from "./tokens";

// Session helpers for Server Components and Server Actions (the Data Access
// Layer). The session is a signed JWT in an httpOnly cookie, so page code
// never sees the token and scripts can't read it.

/** Carries the just-registered email to the sign-in form (F2 FR-10). */
export const REGISTERED_EMAIL_COOKIE = "vault_registered_email";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, read fresh from the database once per request. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await verifyToken(token);
  if (!userId) return null;
  return getUserById(userId);
});

/**
 * For protected pages and every Server Action: returns the user or redirects
 * to sign-in. Server Actions are reachable by direct POST, so each one calls
 * this itself rather than trusting the page that rendered the form.
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  return user;
}
