import { api, href } from "../lib/api";
import { useResource } from "../lib/hooks";
import { domainOf, LoadError, LoadingCards, LocalTime, plural } from "./ui";

/** Greeting, quick actions, counts, recent notes and links, and top tags. */
export function DashboardView() {
  const { data, error } = useResource("dashboard", async () => {
    const [user, dashboard] = await Promise.all([api.me(), api.dashboard()]);
    return { user, ...dashboard };
  });

  if (error) return <LoadError problem={error} />;
  if (!data) return <LoadingCards />;

  const { user, recentNotes, recentLinks, topTags, counts } = data;
  const emptyVault = counts.notes === 0 && counts.links === 0;

  return (
    <div class="stack">
      <p class="wrap-anywhere">Welcome back, {user.name}</p>

      {emptyVault ? (
        <section class="card empty">
          <h2>Your vault is empty</h2>
          <p>Start by writing a note or saving a link you want to keep.</p>
          <div class="actions">
            <a href={href("/notes/new/")} class="btn btn-primary">
              New note
            </a>
            <a href={href("/links/new/")} class="btn">
              Save a link
            </a>
          </div>
        </section>
      ) : (
        <div class="dashboard-grid">
          <section class="card" aria-labelledby="recent-notes">
            <div class="section-header">
              <h2 id="recent-notes">Recent notes</h2>
              <a href={href("/notes/")}>All notes</a>
            </div>
            {recentNotes.length === 0 ? (
              <div class="stack-sm">
                <p class="muted">No notes yet</p>
                <a href={href("/notes/new/")}>New note</a>
              </div>
            ) : (
              <ul class="plain-list">
                {recentNotes.map((note) => (
                  <li key={note.id} class="stack-sm">
                    <a href={`${href("/notes/view/")}?id=${note.id}`} class="item-title">
                      {note.title}
                    </a>
                    {note.contentPreview && <p class="clamp-2 wrap-anywhere muted small">{note.contentPreview}</p>}
                    <span class="item-meta">
                      <LocalTime date={note.createdAt} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section class="card" aria-labelledby="recent-links">
            <div class="section-header">
              <h2 id="recent-links">Recent links</h2>
              <a href={href("/links/")}>All links</a>
            </div>
            {recentLinks.length === 0 ? (
              <div class="stack-sm">
                <p class="muted">No links yet</p>
                <a href={href("/links/new/")}>Save a link</a>
              </div>
            ) : (
              <ul class="plain-list">
                {recentLinks.map((link) => (
                  <li key={link.id} class="item-row">
                    <div class="stack-sm" style={{ minWidth: 0 }}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" class="item-title">
                        {link.title}
                        <span class="visually-hidden"> (opens in new tab)</span>
                      </a>
                      <span class="item-meta">
                        <span class="wrap-anywhere">{domainOf(link.url)}</span>
                        <LocalTime date={link.createdAt} />
                      </span>
                    </div>
                    <a href={`${href("/links/edit/")}?id=${link.id}`} class="btn" aria-label={`Edit ${link.title}`}>
                      Edit
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section class="card span-all" aria-labelledby="top-tags">
            <div class="section-header">
              <h2 id="top-tags">Top tags</h2>
              <a href={href("/tags/")}>Manage tags</a>
            </div>
            {topTags.length === 0 ? (
              <p class="muted">No tagged items yet. Add tags when you edit a note or link.</p>
            ) : (
              <ul class="chips">
                {topTags.map((tag) => (
                  <li key={tag.id}>
                    <a
                      href={`${href("/notes/")}?tag=${tag.id}`}
                      class="chip"
                      aria-label={`${tag.name}, ${plural(tag.itemCount, "item")}`}
                    >
                      {tag.name} · {tag.itemCount}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <p class="stats" aria-label="Vault size">
        {plural(counts.notes, "note")} · {plural(counts.links, "link")} · {plural(counts.tags, "tag")}
      </p>
    </div>
  );
}
