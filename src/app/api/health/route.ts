// F1 FR-4: unauthenticated health check.
export function GET() {
  return Response.json({ status: "ok" });
}
