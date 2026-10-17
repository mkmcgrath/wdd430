"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookie, REGISTERED_EMAIL_COOKIE, setSessionCookie } from "@/lib/auth/session";
import { clientIpFrom, loginLimiter } from "@/lib/auth/rateLimit";
import { createToken, safeReturnUrl } from "@/lib/auth/tokens";
import { UnauthorizedError } from "@/lib/errors";
import { text, toFormState, type FormState } from "@/lib/formState";
import { authenticate, INVALID_CREDENTIALS, registerUser } from "@/lib/services/users";

/** F3: sign in, set the session cookie, go to returnUrl (local paths only). */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = clientIpFrom(await headers());
  if (!loginLimiter.attempt(ip)) {
    return { ok: false, errors: { _: ["Too many sign-in attempts. Wait a minute and try again."] } };
  }

  let user;
  try {
    user = await authenticate({ email: text(formData, "email"), password: text(formData, "password") });
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, errors: { _: [INVALID_CREDENTIALS] } };
    return toFormState(error);
  }

  const { token, expiresAt } = await createToken(user);
  await setSessionCookie(token, expiresAt);
  console.info(`user signed in id=${user.id}`);
  redirect(safeReturnUrl(text(formData, "returnUrl")));
}

/** F2: create an account, then send the user to sign in with their email pre-filled. */
export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = text(formData, "password");
  if (password !== text(formData, "confirmPassword")) {
    return { ok: false, errors: { confirmPassword: ["Passwords do not match"] } };
  }

  let email: string;
  try {
    const user = await registerUser({ name: text(formData, "name"), email: text(formData, "email"), password });
    email = user.email;
    console.info(`user registered id=${user.id}`);
  } catch (error) {
    return toFormState(error);
  }

  // Short-lived cookie instead of a query string, so the email stays out of URLs and logs.
  (await cookies()).set(REGISTERED_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/login",
    maxAge: 120,
  });
  redirect("/login?registered=1");
}

/** F3: sign out. */
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
