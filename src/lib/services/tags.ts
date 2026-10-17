import { prisma, isRecordNotFound, isUniqueViolation } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { normalizeTagName, tagSchema } from "@/lib/validation/schemas";
import type { TagRef } from "./tagging";

// F7 tag management. Tags are private to each user and unique per user
// ignoring case (enforced by the (userId, normalizedName) unique index).

export type TagWithCounts = TagRef & { noteCount: number; linkCount: number };

const TAG_NOT_FOUND = "This tag doesn't exist or was deleted.";
const DUPLICATE_TAG = "A tag with this name already exists.";

export async function listTags(userId: number): Promise<TagWithCounts[]> {
  const rows = await prisma.tag.findMany({
    where: { userId },
    select: { id: true, name: true, _count: { select: { noteTags: true, linkTags: true } } },
    orderBy: { normalizedName: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    noteCount: row._count.noteTags,
    linkCount: row._count.linkTags,
  }));
}

export async function createTag(userId: number, input: unknown): Promise<TagRef> {
  const { name } = parse(tagSchema, input);
  try {
    return await prisma.tag.create({
      data: { userId, name, normalizedName: normalizeTagName(name) },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError(DUPLICATE_TAG, "name");
    throw error;
  }
}

/** Renaming "react" → "React" is allowed: the row conflicts only with itself. */
export async function renameTag(userId: number, id: number, input: unknown): Promise<TagRef> {
  const { name } = parse(tagSchema, input);
  try {
    return await prisma.tag.update({
      where: { id, userId },
      data: { name, normalizedName: normalizeTagName(name) },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError(TAG_NOT_FOUND);
    if (isUniqueViolation(error)) throw new ConflictError(DUPLICATE_TAG, "name");
    throw error;
  }
}

/** Deletes the tag and its join rows (cascade). Notes and links are untouched. */
export async function deleteTag(userId: number, id: number): Promise<void> {
  const { count } = await prisma.tag.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError(TAG_NOT_FOUND);
}
