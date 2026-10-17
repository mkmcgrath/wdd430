import { readJson, requireApiUser, withErrors } from "@/lib/http";
import { updateProfile } from "@/lib/services/users";

// F3: GET /api/auth/me — current user, read fresh from the database.
export const GET = withErrors(async (request) => {
  return Response.json(await requireApiUser(request));
});

// F4: PUT /api/auth/me { name, email }
export const PUT = withErrors(async (request) => {
  const user = await requireApiUser(request);
  return Response.json(await updateProfile(user.id, await readJson(request)));
});
