import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { LinkCard, NoteCard } from "@/components/ItemCards";
import { requireUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { param, type SearchParams } from "@/lib/params";
import { listLinks } from "@/lib/services/links";
import { listNotes } from "@/lib/services/notes";

export const metadata: Metadata = { title: "Search" };

const LIMIT = 20;

// F9 FR-8: results from both lists for the same query, up to 20 each.
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const q = (param(await searchParams, "q") ?? "").trim();

  if (!q) {
    return (
      <>
        <div className="page-header">
          <h1>Search</h1>
        </div>
        <p className="muted">Type in the search box at the top to search your notes and links.</p>
      </>
    );
  }

  let results;
  try {
    results = await Promise.all([listNotes(user.id, { q }), listLinks(user.id, { q })]);
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    return (
      <>
        <div className="page-header">
          <h1>Search</h1>
        </div>
        <Flash tone="error" message={Object.values(error.errors ?? {})[0]?.[0]} />
      </>
    );
  }
  const [notes, links] = results;
  const encoded = encodeURIComponent(q);

  return (
    <>
      <div className="page-header">
        <h1 className="wrap-anywhere">Search: {q}</h1>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {notes.length} notes and {links.length} links found.
      </p>

      {notes.length === 0 && links.length === 0 ? (
        <div className="card empty">
          <p className="wrap-anywhere">No results for &apos;{q}&apos;.</p>
          <Link href="/dashboard" className="btn">
            Clear search
          </Link>
        </div>
      ) : (
        <div className="stack">
          <section className="stack-sm" aria-labelledby="notes-results">
            <h2 id="notes-results">Notes ({notes.length})</h2>
            {notes.length === 0 ? (
              <p className="muted">No matching notes.</p>
            ) : (
              <ul className="card-list">
                {notes.slice(0, LIMIT).map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </ul>
            )}
            {notes.length > LIMIT && <Link href={`/notes?q=${encoded}`}>See all {notes.length} in Notes</Link>}
          </section>

          <section className="stack-sm" aria-labelledby="links-results">
            <h2 id="links-results">Links ({links.length})</h2>
            {links.length === 0 ? (
              <p className="muted">No matching links.</p>
            ) : (
              <ul className="card-list">
                {links.slice(0, LIMIT).map((link) => (
                  <LinkCard key={link.id} link={link} />
                ))}
              </ul>
            )}
            {links.length > LIMIT && <Link href={`/links?q=${encoded}`}>See all {links.length} in Links</Link>}
          </section>
        </div>
      )}
    </>
  );
}
