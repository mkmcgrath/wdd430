// F9: search conditions shared by the notes and links lists.
//
// SQLite's LIKE is already case-insensitive for ASCII, so a plain `contains`
// matches "SQL" with "sql". When the project moves to PostgreSQL, add
// `mode: "insensitive"` here (it becomes ILIKE) and nowhere else.

export function textContains(q: string) {
  return { contains: q };
}

/**
 * Prisma doesn't escape `%` and `_` for SQLite, so `100%` would also match
 * "100 percent" (F9 FR-4). The LIKE query still returns a superset of the
 * true matches, so a literal substring check on the results trims it down.
 */
export function matchesLiterally(q: string | undefined, ...fields: (string | null)[]): boolean {
  if (!q || !/[%_]/.test(q)) return true;
  const needle = q.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
}
