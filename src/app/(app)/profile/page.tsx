import type { Metadata } from "next";
import { logoutAction } from "@/app/actions/auth";
import { AccountDetails, ChangePasswordForm } from "@/components/ProfileForms";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile" };

// F4: account details, change password, sign out.
export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <div className="page-header">
        <h1>Profile</h1>
      </div>
      <div className="stack" style={{ maxWidth: 640 }}>
        <AccountDetails user={{ name: user.name, email: user.email, createdAt: user.createdAt.toISOString() }} />
        <ChangePasswordForm />
        <section className="card stack" aria-labelledby="signout-heading">
          <h2 id="signout-heading">Sign out</h2>
          <p className="muted">Using a shared computer? Sign out when you&apos;re done.</p>
          <form action={logoutAction} className="actions">
            <button type="submit" className="btn">
              Sign out
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
