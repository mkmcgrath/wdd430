import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { one, run } from "./db";

const scryptAsync = promisify<string, Buffer, number, { N: number; r: number; p: number; maxmem: number }, Buffer>(
  scrypt,
);

const COST = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;
const SESSION_HOURS = 8;

export const SESSION_COOKIE = "vault_session";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, COST);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, salt, expected] = stored.split("$");
  const key = await scryptAsync(password, Buffer.from(salt, "base64"), KEY_LENGTH, COST);
  return timingSafeEqual(key, Buffer.from(expected, "base64"));
}

/** Compared against when the email is unknown, so both cases take the same time. */
export const decoyHash = await hashPassword(randomBytes(16).toString("hex"));

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type Session = { token: string; expiresAt: string };

/** Only a hash of the token is stored, so a copy of the database can't be used to sign in. */
export function createSession(userId: number): Session {
  run("DELETE FROM sessions WHERE expires_at <= ?", new Date().toISOString());
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000).toISOString();
  run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function userIdForSession(token: string): number | null {
  const row = one<{ user_id: number }>(
    "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?",
    hashToken(token),
    new Date().toISOString(),
  );
  return row?.user_id ?? null;
}

export function deleteSession(token: string): void {
  run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
}

export function deleteOtherSessions(userId: number, keepToken: string): void {
  run("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", userId, hashToken(keepToken));
}

type Window = { count: number; resetAt: number };

/** Fixed-window, in-memory limiter. Fine for the single API process we run. */
export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records one attempt for `key` and returns false once the limit is exceeded. */
  attempt(key: string, now = Date.now()): boolean {
    for (const [windowKey, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(windowKey);
    }
    const current = this.windows.get(key);
    if (!current) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= this.limit;
  }

  reset() {
    this.windows.clear();
  }
}

export const loginLimiter = new RateLimiter(5, 60_000);
export const registerLimiter = new RateLimiter(10, 60_000);
