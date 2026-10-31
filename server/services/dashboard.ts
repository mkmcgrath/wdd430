import { all, one } from "../db";
import { contentPreview } from "./notes";

export type Dashboard = {
  recentNotes: { id: number; title: string; contentPreview: string; createdAt: string }[];
  recentLinks: { id: number; title: string; url: string; createdAt: string }[];
  topTags: { id: number; name: string; itemCount: number }[];
  counts: { notes: number; links: number; tags: number };
};

export function getDashboard(userId: number): Dashboard {
  const notes = all<{ id: number; title: string; content: string; createdAt: string }>(
    `SELECT id, title, content, created_at AS createdAt FROM notes
     WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5`,
    userId,
  );
  const recentLinks = all<Dashboard["recentLinks"][number]>(
    `SELECT id, title, url, created_at AS createdAt FROM links
     WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5`,
    userId,
  );
  const topTags = all<Dashboard["topTags"][number]>(
    `SELECT t.id, t.name,
       (SELECT COUNT(*) FROM note_tags WHERE tag_id = t.id) +
       (SELECT COUNT(*) FROM link_tags WHERE tag_id = t.id) AS itemCount
     FROM tags t WHERE t.user_id = ? AND itemCount > 0
     ORDER BY itemCount DESC, t.normalized_name LIMIT 10`,
    userId,
  );
  const counts = one<Dashboard["counts"]>(
    `SELECT
       (SELECT COUNT(*) FROM notes WHERE user_id = ?1) AS notes,
       (SELECT COUNT(*) FROM links WHERE user_id = ?1) AS links,
       (SELECT COUNT(*) FROM tags WHERE user_id = ?1) AS tags`,
    userId,
  )!;

  return {
    recentNotes: notes.map(({ content, ...note }) => ({ ...note, contentPreview: contentPreview(content) })),
    recentLinks,
    topTags,
    counts,
  };
}
