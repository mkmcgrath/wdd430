import { readJson, requireApiUser, withErrors } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";
import { parseId } from "@/lib/validation";
import { deleteNote, getNote, updateNote } from "@/lib/services/notes";

type Context = { params: Promise<{ id: string }> };

async function noteId(context: Context) {
  const id = parseId((await context.params).id);
  if (!id) throw new NotFoundError("This note doesn't exist or was deleted.");
  return id;
}

export const GET = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  return Response.json(await getNote(user.id, await noteId(context)));
});

export const PUT = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  const id = await noteId(context);
  return Response.json(await updateNote(user.id, id, await readJson(request)));
});

export const DELETE = withErrors<Context>(async (request, context) => {
  const user = await requireApiUser(request);
  await deleteNote(user.id, await noteId(context));
  return new Response(null, { status: 204 });
});
