import type { SQLInputValue } from "node:sqlite";
import { all, one, run, transaction } from "../db";
import { notFound } from "../errors";
import { linkSchema, listQuerySchema, parse } from "../validation";
import { assertOwnTags, likePattern, LINK_TAGS, replaceTags, tagsFor, type TagRef } from "./tagging";

export type Link = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TagRef[];
};

type LinkRow = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const NOT_FOUND = "This link doesn't exist or was deleted.";

function toLink(row: LinkRow, tags: TagRef[] = []): Link {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

export function listLinks(userId: number, query: unknown = {}): Link[] {
  const { q, tagId } = parse(listQuerySchema, query);
  const clauses = ["user_id = ?"];
  const params: SQLInputValue[] = [userId];
  if (tagId) {
    clauses.push("id IN (SELECT link_id FROM link_tags WHERE tag_id = ?)");
    params.push(tagId);
  }
  if (q) {
    clauses.push(`(title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`);
    params.push(likePattern(q), likePattern(q), likePattern(q));
  }

  const rows = all<LinkRow>(
    `SELECT * FROM links WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, id DESC`,
    ...params,
  );
  const tags = tagsFor(LINK_TAGS, rows.map((row) => row.id));
  return rows.map((row) => toLink(row, tags.get(row.id)));
}

export function getLink(userId: number, id: number): Link {
  const row = one<LinkRow>("SELECT * FROM links WHERE id = ? AND user_id = ?", id, userId);
  if (!row) throw notFound(NOT_FOUND);
  return toLink(row, tagsFor(LINK_TAGS, [id]).get(id));
}

export function createLink(userId: number, input: unknown): Link {
  const data = parse(linkSchema, input);
  const tagIds = data.tagIds ?? [];
  assertOwnTags(userId, tagIds);

  const now = new Date().toISOString();
  const id = transaction(() => {
    const { lastInsertRowid } = run(
      "INSERT INTO links (user_id, title, url, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      userId,
      data.title,
      data.url,
      data.description,
      now,
      now,
    );
    replaceTags(LINK_TAGS, Number(lastInsertRowid), tagIds);
    return Number(lastInsertRowid);
  });
  return getLink(userId, id);
}

export function updateLink(userId: number, id: number, input: unknown): Link {
  const data = parse(linkSchema, input);
  if (data.tagIds) assertOwnTags(userId, data.tagIds);

  transaction(() => {
    const { changes } = run(
      "UPDATE links SET title = ?, url = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      data.title,
      data.url,
      data.description,
      new Date().toISOString(),
      id,
      userId,
    );
    if (changes === 0) throw notFound(NOT_FOUND);
    if (data.tagIds) replaceTags(LINK_TAGS, id, data.tagIds);
  });
  return getLink(userId, id);
}

export function deleteLink(userId: number, id: number): void {
  const { changes } = run("DELETE FROM links WHERE id = ? AND user_id = ?", id, userId);
  if (changes === 0) throw notFound(NOT_FOUND);
}
