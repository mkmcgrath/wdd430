import { prisma, isRecordNotFound } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/lib/errors";
import { parse } from "@/lib/validation";
import { listQuerySchema, noteSchema } from "@/lib/validation/schemas";
import { assertOwnTags, tagRefSelect, toTagRefs, type TagRef } from "./tagging";
import { matchesLiterally, textContains } from "./search";

// F5 notes CRUD (plus F8 tags and F9 search). This module is the pattern the
// links and tags services follow: validate → scope every query by userId →
// shape the response in one place.

export type NoteSummary = {
  id: number;
  title: string;
  contentPreview: string;
  createdAt: Date;
  updatedAt: Date;
  tags: TagRef[];
};

export type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: TagRef[];
};

const NOTE_NOT_FOUND = "This note doesn't exist or was deleted.";

const noteSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  noteTags: tagRefSelect,
} as const;

type NoteRow = Prisma.NoteGetPayload<{ select: typeof noteSelect }>;

/** F5 FR-2: first 200 characters with line breaks replaced by spaces. */
export function contentPreview(content: string): string {
  return content.replace(/\r?\n/g, " ").slice(0, 200);
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: toTagRefs(row.noteTags),
  };
}

function toSummary(row: NoteRow): NoteSummary {
  const { content, ...rest } = toNote(row);
  return { ...rest, contentPreview: contentPreview(content) };
}

export async function listNotes(userId: number, query: unknown = {}): Promise<NoteSummary[]> {
  const { q, tagId } = parse(listQuerySchema, query);
  const where: Prisma.NoteWhereInput = { userId };
  if (tagId) where.noteTags = { some: { tagId } };
  if (q) where.OR = [{ title: textContains(q) }, { content: textContains(q) }];

  const rows = await prisma.note.findMany({
    where,
    select: noteSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  return rows.filter((row) => matchesLiterally(q, row.title, row.content)).map(toSummary);
}

export async function getNote(userId: number, id: number): Promise<Note> {
  const row = await prisma.note.findFirst({ where: { id, userId }, select: noteSelect });
  if (!row) throw new NotFoundError(NOTE_NOT_FOUND);
  return toNote(row);
}

export async function createNote(userId: number, input: unknown): Promise<Note> {
  const data = parse(noteSchema, input);
  const tagIds = data.tagIds ?? [];
  await assertOwnTags(userId, tagIds);

  const row = await prisma.note.create({
    data: {
      userId,
      title: data.title,
      content: data.content,
      noteTags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: noteSelect,
  });
  return toNote(row);
}

export async function updateNote(userId: number, id: number, input: unknown): Promise<Note> {
  const data = parse(noteSchema, input);
  if (data.tagIds) await assertOwnTags(userId, data.tagIds);

  try {
    const row = await prisma.note.update({
      where: { id, userId },
      data: {
        title: data.title,
        content: data.content,
        // F8 FR-2: omitted/null tagIds leaves tags alone; [] clears them.
        ...(data.tagIds && {
          noteTags: { deleteMany: {}, create: data.tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      select: noteSelect,
    });
    return toNote(row);
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError(NOTE_NOT_FOUND);
    throw error;
  }
}

export async function deleteNote(userId: number, id: number): Promise<void> {
  const { count } = await prisma.note.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError(NOTE_NOT_FOUND);
}
