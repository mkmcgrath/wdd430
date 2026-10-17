import { listQueryFrom, readJson, requireApiUser, withErrors } from "@/lib/http";
import { createNote, listNotes } from "@/lib/services/notes";

// F5/F8/F9: GET /api/notes?q=&tagId=
export const GET = withErrors(async (request) => {
  const user = await requireApiUser(request);
  return Response.json(await listNotes(user.id, listQueryFrom(request)));
});

// F5: POST /api/notes { title, content, tagIds? } → 201 + Location
export const POST = withErrors(async (request) => {
  const user = await requireApiUser(request);
  const note = await createNote(user.id, await readJson(request));
  return Response.json(note, { status: 201, headers: { location: `/api/notes/${note.id}` } });
});
