import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <div className="card auth-card stack">
        <h1>Page not found</h1>
        <p>We couldn&apos;t find that page.</p>
        <Link href="/dashboard" className="btn btn-primary">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
