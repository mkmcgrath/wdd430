import { api, href } from "../lib/api";
import { useResource, useUrlParams } from "../lib/hooks";
import { LinkCard, NoteCard } from "./ItemCards";
import { LoadError, LoadingCards, plural } from "./ui";

const LIMIT = 20;

/** Results from both lists for the same query, up to 20 of each. */
export function SearchResults() {
  const params = useUrlParams();
  const q = params?.get("q")?.trim() ?? "";

  const { data, error, reload } = useResource(q ? q : null, async () => {
    const [notes, links] = await Promise.all([api.notes({ q }), api.links({ q })]);
    return { notes, links };
  });

  if (!params) return <LoadingCards />;
  if (!q) return <p class="muted">Type in the search box at the top to search your notes and links.</p>;
  if (error) return <LoadError problem={error} />;
  if (!data) return <LoadingCards />;

  const { notes, links } = data;
  const encoded = encodeURIComponent(q);

  if (notes.length === 0 && links.length === 0) {
    return (
      <div class="card empty">
        <p class="wrap-anywhere">No results for '{q}'.</p>
        <a href={href("/dashboard/")} class="btn">
          Clear search
        </a>
      </div>
    );
  }

  return (
    <div class="stack">
      <p class="muted wrap-anywhere" aria-live="polite">
        {plural(notes.length, "note")} and {plural(links.length, "link")} found for '{q}'.
      </p>

      <section class="stack-sm" aria-labelledby="note-results">
        <h2 id="note-results">Notes ({notes.length})</h2>
        {notes.length === 0 ? (
          <p class="muted">No matching notes.</p>
        ) : (
          <ul class="card-list">
            {notes.slice(0, LIMIT).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
        )}
        {notes.length > LIMIT && <a href={`${href("/notes/")}?q=${encoded}`}>See all {notes.length} in Notes</a>}
      </section>

      <section class="stack-sm" aria-labelledby="link-results">
        <h2 id="link-results">Links ({links.length})</h2>
        {links.length === 0 ? (
          <p class="muted">No matching links.</p>
        ) : (
          <ul class="card-list">
            {links.slice(0, LIMIT).map((link) => (
              <LinkCard key={link.id} link={link} onDeleted={reload} />
            ))}
          </ul>
        )}
        {links.length > LIMIT && <a href={`${href("/links/")}?q=${encoded}`}>See all {links.length} in Links</a>}
      </section>
    </div>
  );
}
