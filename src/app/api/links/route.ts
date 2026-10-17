import { listQueryFrom, readJson, requireApiUser, withErrors } from "@/lib/http";
import { createLink, listLinks } from "@/lib/services/links";

// F6/F8/F9: GET /api/links?q=&tagId=
export const GET = withErrors(async (request) => {
  const user = await requireApiUser(request);
  return Response.json(await listLinks(user.id, listQueryFrom(request)));
});

// F6: POST /api/links { url, title?, description?, tagIds? } → 201 + Location
export const POST = withErrors(async (request) => {
  const user = await requireApiUser(request);
  const link = await createLink(user.id, await readJson(request));
  return Response.json(link, { status: 201, headers: { location: `/api/links/${link.id}` } });
});
