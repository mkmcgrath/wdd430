export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="auth-brand">Knowledge Vault</span>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
