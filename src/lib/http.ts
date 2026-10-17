import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getUserById } from "@/lib/services/users";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/tokens";

// Helpers for the JSON API route handlers under src/app/api.

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** RFC 9457 problem response (convention C2). */
export function problem(
  status: number,
  title: string,
  extra: { detail?: string; errors?: Record<string, string[]>; requestId?: string } = {},
): Response {
  const requestId = extra.requestId ?? crypto.randomUUID();
  return new Response(
    JSON.stringify({
      type: "about:blank",
      title,
      status,
      ...(extra.detail && { detail: extra.detail }),
      ...(extra.errors && { errors: extra.errors }),
      requestId,
    }),
    { status, headers: { "content-type": "application/problem+json", "x-request-id": requestId } },
  );
}

/**
 * Wraps a route handler so every thrown error becomes a problem response.
 * Unexpected errors are logged with a request ID and returned as a bare 500 —
 * never with a stack trace.
 */
export function withErrors<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) {
        return problem(error.status, error.title, { detail: error.detail, errors: error.errors });
      }
      const requestId = crypto.randomUUID();
      console.error(`[${requestId}] ${request.method} ${new URL(request.url).pathname} failed:`, error);
      return problem(500, "Internal server error", {
        detail: "Something went wrong on our side.",
        requestId,
      });
    }
  };
}

/** Reads a JSON body. Requiring the JSON content type also blocks simple cross-site form posts. */
export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new ValidationError({ _: ["Request body must be JSON (Content-Type: application/json)."] });
  }
  try {
    return await request.json();
  } catch {
    throw new ValidationError({ _: ["Request body is not valid JSON."] });
  }
}

/** Set-Cookie value for the httpOnly session cookie (same attributes as session.ts). */
export function sessionCookieHeader(token: string, expiresAt: Date): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; Expires=${expiresAt.toUTCString()}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Token from `Authorization: Bearer …` (API clients) or the session cookie (browser). */
export function tokenFrom(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return readCookie(request, SESSION_COOKIE);
}

/**
 * The only way API handlers learn who the caller is (convention C1).
 * Throws 401 for a missing, invalid or expired token, or a deleted user.
 */
export async function requireApiUser(request: Request) {
  const userId = await verifyToken(tokenFrom(request));
  if (!userId) throw new UnauthorizedError("Your session is missing or has expired.");
  const user = await getUserById(userId);
  if (!user) throw new UnauthorizedError("Your session is missing or has expired.");
  return user;
}

/** Reads `q` and `tagId` from a list URL. */
export function listQueryFrom(request: Request) {
  const params = new URL(request.url).searchParams;
  return { q: params.get("q") ?? undefined, tagId: params.get("tagId") || undefined };
}
