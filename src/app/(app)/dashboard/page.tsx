import type { Metadata } from "next";
import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import { requireUser } from "@/lib/auth/session";
import { domainOf } from "@/lib/params";
import { getDashboard } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// F10: greeting, quick actions, counts, recent notes/links, top tags — one query batch.
export default async function DashboardPage() {
  const user = await requireUser();
  const { recentNotes, recentLinks, topTags, counts } = await getDashboard(user.id);
  const emptyVault = counts.notes === 0 && counts.links === 0;

  return (
    <div className="stack">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="stack-sm">
          <h1>Dashboard</h1>
          <p className="wrap-anywhere">Welcome back, {user.name}</p>
        </div>
        <div className="actions">
          <Link href="/notes/new" className="btn btn-primary">
            New note
          </Link>
          <Link href="/links/new" className="btn btn-primary">
            Save a link
          </Link>
        </div>
      </div>

      {emptyVault ? (
        <section className="card empty">
          <h2>Your vault is empty</h2>
          <p>Start by writing a note or saving a link you want to keep.</p>
          <div className="actions">
            <Link href="/notes/new" className="btn btn-primary">
              New note
            </Link>
            <Link href="/links/new" className="btn">
              Save a link
            </Link>
          </div>
        </section>
      ) : (
        <div className="dashboard-grid">
          <section className="card" aria-labelledby="recent-notes">
            <div className="section-header">
              <h2 id="recent-notes">Recent notes</h2>
              <Link href="/notes">All notes</Link>
            </div>
            {recentNotes.length === 0 ? (
              <div className="stack-sm">
                <p className="muted">No notes yet</p>
                <Link href="/notes/new">New note</Link>
              </div>
            ) : (
              <ul className="plain-list">
                {recentNotes.map((note) => (
                  <li key={note.id} className="stack-sm">
                    <Link href={`/notes/${note.id}`} className="item-title">
                      {note.title}
                    </Link>
                    {note.contentPreview && <p className="clamp-2 wrap-anywhere muted small">{note.contentPreview}</p>}
                    <span className="item-meta">
                      <LocalTime date={note.createdAt} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="recent-links">
            <div className="section-header">
              <h2 id="recent-links">Recent links</h2>
              <Link href="/links">All links</Link>
            </div>
            {recentLinks.length === 0 ? (
              <div className="stack-sm">
                <p className="muted">No links yet</p>
                <Link href="/links/new">Save a link</Link>
              </div>
            ) : (
              <ul className="plain-list">
                {recentLinks.map((link) => (
                  <li key={link.id} className="item-row">
                    <div className="stack-sm" style={{ minWidth: 0 }}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="item-title">
                        {link.title}
                        <span className="visually-hidden"> (opens in new tab)</span>
                      </a>
                      <span className="item-meta">
                        <span className="wrap-anywhere">{domainOf(link.url)}</span>
                        <LocalTime date={link.createdAt} />
                      </span>
                    </div>
                    <Link href={`/links/${link.id}/edit`} className="btn" aria-label={`Edit ${link.title}`}>
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card span-all" aria-labelledby="top-tags">
            <div className="section-header">
              <h2 id="top-tags">Top tags</h2>
              <Link href="/tags">Manage tags</Link>
            </div>
            {topTags.length === 0 ? (
              <p className="muted">No tagged items yet. Add tags when you edit a note or link.</p>
            ) : (
              <ul className="chips">
                {topTags.map((tag) => (
                  <li key={tag.id}>
                    <Link href={`/notes?tag=${tag.id}`} className="chip" aria-label={`${tag.name}, ${plural(tag.itemCount, "item")}`}>
                      {tag.name} · {tag.itemCount}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <p className="stats" aria-label="Vault size">
        {plural(counts.notes, "note")} · {plural(counts.links, "link")} · {plural(counts.tags, "tag")}
      </p>
    </div>
  );
}
