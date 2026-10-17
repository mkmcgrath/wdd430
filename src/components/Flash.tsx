/** One-off status message (e.g. "Saved.") announced to screen readers. */
export function Flash({ message, tone = "success" }: { message?: string | null; tone?: "success" | "info" | "error" }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {message}
    </div>
  );
}
