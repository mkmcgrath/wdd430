import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/tokens";

// Optimistic route guard (F3 FR-9). Signed-out visitors to any page other than
// /login and /register are sent to /login with a returnUrl. This only checks
// the token's signature and expiry; pages and actions still verify the user
// against the database through requireUser().

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifyToken(token)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("returnUrl", pathname + search);
  if (token) loginUrl.searchParams.set("expired", "1");

  const response = NextResponse.redirect(loginUrl);
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Everything except the API (which answers 401 itself), auth pages, and static assets.
  matcher: ["/((?!api|login|register|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
