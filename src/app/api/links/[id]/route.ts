import { readJson, requireApiUser, withErrors } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";
import { parseId } from "@/lib/validation";
import { deleteLink, getLink, updateLink } from "@/lib/services/links";

type Context = { params: Promise<{ id: string }> };

async function linkId(context: Context) {
  const id = parseId((await context.params).id);
  if (!id) throw new NotFoundError("This link doesn't exist or was deleted.");
  return id;
}

export const GET = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  return Response.json(await getLink(user.id, await linkId(context)));
});

export const PUT = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  const id = await linkId(context);
  return Response.json(await updateLink(user.id, id, await readJson(request)));
});

export const DELETE = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  await deleteLink(user.id, await linkId(context));
  return new Response(null, { status: 204 });
});
