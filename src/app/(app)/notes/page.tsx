import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/Flash";
import { NoteCard } from "@/components/ItemCards";
import { ListFilters } from "@/components/ListFilters";
import { requireUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { param, type SearchParams } from "@/lib/params";
import { listNotes, type NoteSummary } from "@/lib/services/notes";
import { listTags } from "@/lib/services/tags";
import { parseId } from "@/lib/validation";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = param(params, "q") ?? "";
  const tagParam = param(params, "tag");
  const tagId = tagParam ? (parseId(tagParam) ?? undefined) : undefined;

  const tags = await listTags(user.id);
  let notes: NoteSummary[] = [];
  let error: string | undefined;
  try {
    notes = await listNotes(user.id, { q, tagId });
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    error = Object.values(e.errors ?? {})[0]?.[0];
  }
  const filtered = Boolean(q.trim() || tagId);
  const tagName = tags.find((tag) => tag.id === tagId)?.name;

  return (
    <>
      <div className="page-header">
        <h1>Notes</h1>
        <Link href="/notes/new" className="btn btn-primary">
          New note
        </Link>
      </div>
      {param(params, "deleted") && <Flash message="Note deleted." />}
      <ListFilters key={tagId ?? "all"} tags={tags} q={q} tagId={tagId} searchLabel="Search notes" />
      {error && <Flash tone="error" message={error} />}

      {notes.length === 0 && !error ? (
        <div className="card empty">
          {!filtered ? (
            <>
              <p>No notes yet</p>
              <Link href="/notes/new" className="btn btn-primary">
                New note
              </Link>
            </>
          ) : (
            <>
              <p className="wrap-anywhere">
                {q.trim() ? `No results for '${q.trim()}'.` : `No notes tagged '${tagName ?? "this tag"}'.`}
              </p>
              <Link href="/notes" className="btn">
                {q.trim() ? "Clear search" : "Clear filter"}
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="card-list" aria-label={`${notes.length} notes`}>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </>
  );
}
