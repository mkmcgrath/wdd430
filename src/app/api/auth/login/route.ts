import { clientIpFrom, loginLimiter } from "@/lib/auth/rateLimit";
import { createToken } from "@/lib/auth/tokens";
import { readJson, sessionCookieHeader, withErrors } from "@/lib/http";
import { RateLimitError } from "@/lib/errors";
import { authenticate } from "@/lib/services/users";

// F3: POST /api/auth/login → 200 { token, expiresAt, user }
// Also sets the httpOnly session cookie so browsers are signed in too.
export const POST = withErrors(async (request) => {
  const ip = clientIpFrom(request.headers);
  if (!loginLimiter.attempt(ip)) {
    console.warn(`login rate limited ip=${ip}`);
    throw new RateLimitError("Too many sign-in attempts. Wait a minute and try again.");
  }

  const user = await authenticate(await readJson(request));
  const { token, expiresAt } = await createToken(user);
  console.info(`user signed in id=${user.id}`);
  return Response.json(
    { token, expiresAt, user },
    { headers: { "set-cookie": sessionCookieHeader(token, expiresAt) } },
  );
});
