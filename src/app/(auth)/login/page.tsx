import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { Flash } from "@/components/Flash";
import { getCurrentUser, REGISTERED_EMAIL_COOKIE } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/tokens";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  // F3 FR-12: already signed in → dashboard.
  if (await getCurrentUser()) redirect("/dashboard");

  const params = await searchParams;
  const returnUrl = typeof params.returnUrl === "string" ? safeReturnUrl(params.returnUrl) : undefined;
  const registeredEmail = (await cookies()).get(REGISTERED_EMAIL_COOKIE)?.value;

  return (
    <div className="stack">
      <h1>Sign in</h1>
      {params.registered && <Flash message="Account created. Please sign in." />}
      {params.expired && <Flash tone="info" message="Your session has expired. Please sign in again." />}
      <LoginForm returnUrl={returnUrl} defaultEmail={params.registered ? registeredEmail : undefined} />
    </div>
  );
}
