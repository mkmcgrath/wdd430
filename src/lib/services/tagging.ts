import { prisma } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

export type TagRef = { id: number; name: string };

/**
 * F8 FR-3: every tag ID must belong to the user. A missing tag and another
 * user's tag produce the same error so tag IDs can't be probed.
 */
export async function assertOwnTags(userId: number, tagIds: number[]): Promise<void> {
  if (tagIds.length === 0) return;
  const owned = await prisma.tag.count({ where: { userId, id: { in: tagIds } } });
  if (owned !== tagIds.length) {
    throw new ValidationError({ tagIds: ["One or more selected tags don't exist."] });
  }
}

/** Shared include for loading an item's tags with the item itself (no N+1 queries). */
export const tagRefSelect = {
  select: { tag: { select: { id: true, name: true, normalizedName: true } } },
} as const;

/** Flatten join rows into `{ id, name }[]` sorted by name ignoring case (F8 FR-5). */
export function toTagRefs(rows: { tag: { id: number; name: string; normalizedName: string } }[]): TagRef[] {
  return rows
    .map((row) => row.tag)
    .sort((a, b) => (a.normalizedName < b.normalizedName ? -1 : a.normalizedName > b.normalizedName ? 1 : 0))
    .map(({ id, name }) => ({ id, name }));
}
