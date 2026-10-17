"use client";

// Unhandled errors while rendering a page (F1 §10 states).
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-shell">
      <div className="card auth-card stack" role="alert">
        <h1>Something went wrong</h1>
        <p>Sorry — that didn&apos;t work. Try again, or reload the page.</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    </main>
  );
}
