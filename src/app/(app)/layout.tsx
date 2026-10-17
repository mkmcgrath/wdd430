import Link from "next/link";
import { NavMenu } from "@/components/NavMenu";
import { requireUser } from "@/lib/auth/session";

// App shell for every signed-in page (F1 FR-7): skip link, header with
// navigation, search and account controls, then the page in <main>.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/dashboard" className="brand">
            Knowledge Vault
          </Link>
          <NavMenu userName={user.name} />
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
