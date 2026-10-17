import { readJson, withErrors } from "@/lib/http";
import { registerUser } from "@/lib/services/users";

// F2: POST /api/auth/register → 201 { id, name, email, createdAt }
export const POST = withErrors(async (request) => {
  const user = await registerUser(await readJson(request));
  console.info(`user registered id=${user.id}`);
  return Response.json(user, { status: 201 });
});
