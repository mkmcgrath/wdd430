import { all, one, run } from "../db";
import { validationError } from "../errors";

export type TagRef = { id: number; name: string };

type JoinTable = { table: "note_tags" | "link_tags"; column: "note_id" | "link_id" };

export const NOTE_TAGS: JoinTable = { table: "note_tags", column: "note_id" };
export const LINK_TAGS: JoinTable = { table: "link_tags", column: "link_id" };

/**
 * Every tag ID must belong to the user. A missing tag and another user's tag
 * produce the same error so tag IDs can't be probed.
 */
export function assertOwnTags(userId: number, tagIds: number[]): void {
  if (tagIds.length === 0) return;
  const { owned } = one<{ owned: number }>(
    "SELECT COUNT(*) AS owned FROM tags WHERE user_id = ? AND id IN (SELECT value FROM json_each(?))",
    userId,
    JSON.stringify(tagIds),
  )!;
  if (owned !== tagIds.length) {
    throw validationError({ tagIds: ["One or more selected tags don't exist."] });
  }
}

/** Loads tags for many items in one query, sorted by name ignoring case. */
export function tagsFor({ table, column }: JoinTable, itemIds: number[]): Map<number, TagRef[]> {
  const rows = all<TagRef & { itemId: number }>(
    `SELECT j.${column} AS itemId, t.id, t.name
     FROM ${table} j JOIN tags t ON t.id = j.tag_id
     WHERE j.${column} IN (SELECT value FROM json_each(?))
     ORDER BY t.normalized_name`,
    JSON.stringify(itemIds),
  );
  const byItem = new Map<number, TagRef[]>();
  for (const { itemId, id, name } of rows) {
    if (!byItem.has(itemId)) byItem.set(itemId, []);
    byItem.get(itemId)!.push({ id, name });
  }
  return byItem;
}

export function replaceTags({ table, column }: JoinTable, itemId: number, tagIds: number[]): void {
  run(`DELETE FROM ${table} WHERE ${column} = ?`, itemId);
  for (const tagId of tagIds) {
    run(`INSERT INTO ${table} (${column}, tag_id) VALUES (?, ?)`, itemId, tagId);
  }
}

/** Builds a LIKE pattern that treats %, _ and \ in the search text literally. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}
