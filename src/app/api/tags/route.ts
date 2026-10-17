import { readJson, requireApiUser, withErrors } from "@/lib/http";
import { createTag, listTags } from "@/lib/services/tags";

// F7: GET /api/tags → [{ id, name, noteCount, linkCount }]
export const GET = withErrors(async (request) => {
  const user = await requireApiUser(request);
  return Response.json(await listTags(user.id));
});

// F7: POST /api/tags { name } → 201
export const POST = withErrors(async (request) => {
  const user = await requireApiUser(request);
  return Response.json(await createTag(user.id, await readJson(request)), { status: 201 });
});
