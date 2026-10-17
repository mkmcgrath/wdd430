import { prisma } from "@/lib/db";
import { contentPreview } from "./notes";

// F10: everything the dashboard needs in one call.

export type Dashboard = {
  recentNotes: { id: number; title: string; contentPreview: string; createdAt: Date }[];
  recentLinks: { id: number; title: string; url: string; createdAt: Date }[];
  topTags: { id: number; name: string; itemCount: number }[];
  counts: { notes: number; links: number; tags: number };
};

export async function getDashboard(userId: number): Promise<Dashboard> {
  const [notes, links, tags, noteCount, linkCount] = await Promise.all([
    prisma.note.findMany({
      where: { userId },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
    prisma.link.findMany({
      where: { userId },
      select: { id: true, title: true, url: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
    prisma.tag.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        _count: { select: { noteTags: true, linkTags: true } },
      },
    }),
    prisma.note.count({ where: { userId } }),
    prisma.link.count({ where: { userId } }),
  ]);

  const topTags = tags
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      key: tag.normalizedName,
      itemCount: tag._count.noteTags + tag._count.linkTags,
    }))
    .filter((tag) => tag.itemCount > 0)
    .sort((a, b) => b.itemCount - a.itemCount || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(0, 10)
    .map(({ id, name, itemCount }) => ({ id, name, itemCount }));

  return {
    recentNotes: notes.map(({ content, ...note }) => ({ ...note, contentPreview: contentPreview(content) })),
    recentLinks: links,
    topTags,
    counts: { notes: noteCount, links: linkCount, tags: tags.length },
  };
}
