/** Only same-app paths are allowed, so a crafted link can't redirect off-site after sign-in. */
export function safeReturnUrl(value: string | null, base: string): string | undefined {
  if (!value || !value.startsWith(base)) return undefined;
  if (value.includes("\\") || value.slice(base.length).startsWith("/")) return undefined;
  return value;
}
