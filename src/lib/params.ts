export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** First value of a search param, or undefined. */
export function param(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Hostname for display, e.g. "expressjs.com" (F6 FR-11). */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
