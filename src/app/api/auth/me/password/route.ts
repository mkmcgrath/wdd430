import { readJson, requireApiUser, withErrors } from "@/lib/http";
import { changePassword } from "@/lib/services/users";

// F4: PUT /api/auth/me/password { currentPassword, newPassword } → 204
export const PUT = withErrors(async (request) => {
  const user = await requireApiUser(request);
  await changePassword(user.id, await readJson(request));
  return new Response(null, { status: 204 });
});
