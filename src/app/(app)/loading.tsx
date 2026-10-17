export default function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
      <div className="skeleton" style={{ height: 36, width: "40%" }} />
      <div className="skeleton" style={{ height: 88 }} />
      <div className="skeleton" style={{ height: 88 }} />
      <div className="skeleton" style={{ height: 88 }} />
    </div>
  );
}
