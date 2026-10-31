import type { SQLInputValue } from "node:sqlite";
import { all, one, run, transaction } from "../db";
import { notFound } from "../errors";
import { listQuerySchema, noteSchema, parse } from "../validation";
import { assertOwnTags, likePattern, NOTE_TAGS, replaceTags, tagsFor, type TagRef } from "./tagging";

export type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
};

export type NoteSummary = Omit<Note, "content"> & { contentPreview: string };

type NoteRow = { id: number; title: string; content: string; created_at: string; updated_at: string };

const NOT_FOUND = "This note doesn't exist or was deleted.";

/** First 200 characters with line breaks replaced by spaces. */
export function contentPreview(content: string): string {
  return content.replace(/\n/g, " ").slice(0, 200);
}

function toNote(row: NoteRow, tags: TagRef[] = []): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

export function listNotes(userId: number, query: unknown = {}): NoteSummary[] {
  const { q, tagId } = parse(listQuerySchema, query);
  const clauses = ["user_id = ?"];
  const params: SQLInputValue[] = [userId];
  if (tagId) {
    clauses.push("id IN (SELECT note_id FROM note_tags WHERE tag_id = ?)");
    params.push(tagId);
  }
  if (q) {
    clauses.push(`(title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')`);
    params.push(likePattern(q), likePattern(q));
  }

  const rows = all<NoteRow>(
    `SELECT * FROM notes WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, id DESC`,
    ...params,
  );
  const tags = tagsFor(NOTE_TAGS, rows.map((row) => row.id));
  return rows.map((row) => {
    const { content, ...note } = toNote(row, tags.get(row.id));
    return { ...note, contentPreview: contentPreview(content) };
  });
}

export function getNote(userId: number, id: number): Note {
  const row = one<NoteRow>("SELECT * FROM notes WHERE id = ? AND user_id = ?", id, userId);
  if (!row) throw notFound(NOT_FOUND);
  return toNote(row, tagsFor(NOTE_TAGS, [id]).get(id));
}

export function createNote(userId: number, input: unknown): Note {
  const data = parse(noteSchema, input);
  const tagIds = data.tagIds ?? [];
  assertOwnTags(userId, tagIds);

  const now = new Date().toISOString();
  const id = transaction(() => {
    const { lastInsertRowid } = run(
      "INSERT INTO notes (user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      userId,
      data.title,
      data.content,
      now,
      now,
    );
    replaceTags(NOTE_TAGS, Number(lastInsertRowid), tagIds);
    return Number(lastInsertRowid);
  });
  return getNote(userId, id);
}

export function updateNote(userId: number, id: number, input: unknown): Note {
  const data = parse(noteSchema, input);
  if (data.tagIds) assertOwnTags(userId, data.tagIds);

  transaction(() => {
    const { changes } = run(
      "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      data.title,
      data.content,
      new Date().toISOString(),
      id,
      userId,
    );
    if (changes === 0) throw notFound(NOT_FOUND);
    if (data.tagIds) replaceTags(NOTE_TAGS, id, data.tagIds);
  });
  return getNote(userId, id);
}

export function deleteNote(userId: number, id: number): void {
  const { changes } = run("DELETE FROM notes WHERE id = ? AND user_id = ?", id, userId);
  if (changes === 0) throw notFound(NOT_FOUND);
}
