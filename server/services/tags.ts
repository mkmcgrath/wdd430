import { all, isUniqueViolation, one, run } from "../db";
import { conflict, notFound } from "../errors";
import { normalizeTagName, parse, tagSchema } from "../validation";
import type { TagRef } from "./tagging";

export type TagWithCounts = TagRef & { noteCount: number; linkCount: number };

const NOT_FOUND = "This tag doesn't exist or was deleted.";
const DUPLICATE = "A tag with this name already exists.";

export function listTags(userId: number): TagWithCounts[] {
  return all<TagWithCounts>(
    `SELECT t.id, t.name,
       (SELECT COUNT(*) FROM note_tags WHERE tag_id = t.id) AS noteCount,
       (SELECT COUNT(*) FROM link_tags WHERE tag_id = t.id) AS linkCount
     FROM tags t WHERE t.user_id = ? ORDER BY t.normalized_name`,
    userId,
  );
}

export function createTag(userId: number, input: unknown): TagRef {
  const { name } = parse(tagSchema, input);
  try {
    const { lastInsertRowid } = run(
      "INSERT INTO tags (user_id, name, normalized_name) VALUES (?, ?, ?)",
      userId,
      name,
      normalizeTagName(name),
    );
    return { id: Number(lastInsertRowid), name };
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(DUPLICATE, "name");
    throw error;
  }
}

/** Renaming "react" to "React" is allowed: the row conflicts only with itself. */
export function renameTag(userId: number, id: number, input: unknown): TagRef {
  const { name } = parse(tagSchema, input);
  try {
    const { changes } = run(
      "UPDATE tags SET name = ?, normalized_name = ? WHERE id = ? AND user_id = ?",
      name,
      normalizeTagName(name),
      id,
      userId,
    );
    if (changes === 0) throw notFound(NOT_FOUND);
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(DUPLICATE, "name");
    throw error;
  }
  return one<TagRef>("SELECT id, name FROM tags WHERE id = ?", id)!;
}

/** Deletes the tag and its join rows. Notes and links are untouched. */
export function deleteTag(userId: number, id: number): void {
  const { changes } = run("DELETE FROM tags WHERE id = ? AND user_id = ?", id, userId);
  if (changes === 0) throw notFound(NOT_FOUND);
}
