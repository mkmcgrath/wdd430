// Fixed-window, in-memory rate limiter (F3 FR-13: 5 sign-in attempts per
// minute per IP). In-memory is fine for a single-process prototype; a
// multi-instance deployment would need a shared store.

type Window = { count: number; resetAt: number };

export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records one attempt for `key`; returns false once the limit is exceeded. */
  attempt(key: string, now = Date.now()): boolean {
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
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

/** Best-effort client IP from proxy headers; falls back to a shared bucket. */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "local";
}
