import { prisma, isRecordNotFound } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { linkSchema, listQuerySchema } from "@/lib/validation/schemas";
import { assertOwnTags, tagRefSelect, toTagRefs, type TagRef } from "./tagging";
import { matchesLiterally, textContains } from "./search";

// F6 links CRUD (plus F8 tags and F9 search). Mirrors notes.ts.

export type Link = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: TagRef[];
};

const LINK_NOT_FOUND = "This link doesn't exist or was deleted.";

const linkSelect = {
  id: true,
  title: true,
  url: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  linkTags: tagRefSelect,
} as const;

type LinkRow = Prisma.LinkGetPayload<{ select: typeof linkSelect }>;

function toLink({ linkTags, ...row }: LinkRow): Link {
  return { ...row, tags: toTagRefs(linkTags) };
}

export async function listLinks(userId: number, query: unknown = {}): Promise<Link[]> {
  const { q, tagId } = parse(listQuerySchema, query);
  const where: Prisma.LinkWhereInput = { userId };
  if (tagId) where.linkTags = { some: { tagId } };
  if (q) {
    where.OR = [{ title: textContains(q) }, { url: textContains(q) }, { description: textContains(q) }];
  }

  const rows = await prisma.link.findMany({
    where,
    select: linkSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  return rows.filter((row) => matchesLiterally(q, row.title, row.url, row.description)).map(toLink);
}

export async function getLink(userId: number, id: number): Promise<Link> {
  const row = await prisma.link.findFirst({ where: { id, userId }, select: linkSelect });
  if (!row) throw new NotFoundError(LINK_NOT_FOUND);
  return toLink(row);
}

export async function createLink(userId: number, input: unknown): Promise<Link> {
  const data = parse(linkSchema, input);
  const tagIds = data.tagIds ?? [];
  await assertOwnTags(userId, tagIds);

  const row = await prisma.link.create({
    data: {
      userId,
      url: data.url,
      title: data.title,
      description: data.description,
      linkTags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: linkSelect,
  });
  return toLink(row);
}

export async function updateLink(userId: number, id: number, input: unknown): Promise<Link> {
  const data = parse(linkSchema, input);
  if (data.tagIds) await assertOwnTags(userId, data.tagIds);

  try {
    const row = await prisma.link.update({
      where: { id, userId },
      data: {
        url: data.url,
        title: data.title,
        description: data.description,
        ...(data.tagIds && {
          linkTags: { deleteMany: {}, create: data.tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      select: linkSelect,
    });
    return toLink(row);
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError(LINK_NOT_FOUND);
    throw error;
  }
}

export async function deleteLink(userId: number, id: number): Promise<void> {
  const { count } = await prisma.link.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError(LINK_NOT_FOUND);
}
