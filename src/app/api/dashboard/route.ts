import { requireApiUser, withErrors } from "@/lib/http";
import { getDashboard } from "@/lib/services/dashboard";

// F10: GET /api/dashboard — recent notes/links, top tags, counts in one call.
export const GET = withErrors(async (request) => {
  const user = await requireApiUser(request);
  return Response.json(await getDashboard(user.id));
});
