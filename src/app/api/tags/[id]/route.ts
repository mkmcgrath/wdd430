import { readJson, requireApiUser, withErrors } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";
import { parseId } from "@/lib/validation";
import { deleteTag, renameTag } from "@/lib/services/tags";

type Context = { params: Promise<{ id: string }> };

async function tagId(context: Context) {
  const id = parseId((await context.params).id);
  if (!id) throw new NotFoundError("This tag doesn't exist or was deleted.");
  return id;
}

// F7: PUT /api/tags/{id} { name }
export const PUT = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  const id = await tagId(context);
  return Response.json(await renameTag(user.id, id, await readJson(request)));
});

// F7: DELETE /api/tags/{id} → 204 (notes and links keep existing)
export const DELETE = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  await deleteTag(user.id, await tagId(context));
  return new Response(null, { status: 204 });
});
