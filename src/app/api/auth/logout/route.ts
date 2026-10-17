import { clearSessionCookieHeader } from "@/lib/http";

// F3: sign-out clears the session cookie. Tokens are stateless, so a copied
// token stays valid until it expires (accepted for the MVP).
export function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": clearSessionCookieHeader() } });
}
