import { jwtVerify, SignJWT } from "jose";

// Session tokens (F3 FR-4): HS256 JWTs with `sub`, `name`, `email`, `exp`.
// Kept free of Next.js imports so the proxy, route handlers and tests can all
// use it.

export const SESSION_COOKIE = "vault_session";

const DEFAULT_LIFETIME_MINUTES = 480;
const CLOCK_TOLERANCE_SECONDS = 60;

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters. See .env.example.");
  }
  return new TextEncoder().encode(secret);
}

function lifetimeMinutes(): number {
  const value = Number(process.env.JWT_LIFETIME_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIFETIME_MINUTES;
}

export async function createToken(
  user: { id: number; name: string; email: string },
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(now.getTime() + lifetimeMinutes() * 60_000);
  const token = await new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
  return { token, expiresAt };
}

/** Returns the user ID from a valid token, or null for missing/tampered/expired tokens. */
export async function verifyToken(token: string | undefined | null): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

/** Only allow redirects to local paths after sign-in (F3 FR-9, open-redirect guard). */
export function safeReturnUrl(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/register")) return "/dashboard";
  return value;
}
