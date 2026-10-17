import type { Metadata } from "next";
import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import { NoteEditor } from "@/components/NoteEditor";
import { requireUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { param, type SearchParams } from "@/lib/params";
import { getNote, type Note } from "@/lib/services/notes";
import { listTags } from "@/lib/services/tags";
import { parseId } from "@/lib/validation";

export const metadata: Metadata = { title: "Edit note" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default async function NotePage({ params, searchParams }: Props) {
  const user = await requireUser();
  const id = parseId((await params).id);

  let note: Note | null = null;
  if (id) {
    try {
      note = await getNote(user.id, id);
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
    }
  }

  if (!note) {
    return (
      <div className="card empty">
        <h1>Note not found</h1>
        <p>This note doesn&apos;t exist or was deleted.</p>
        <Link href="/notes" className="btn btn-primary">
          Back to notes
        </Link>
      </div>
    );
  }

  const tags = await listTags(user.id);
  return (
    <>
      <div className="page-header">
        <h1>Edit note</h1>
        <p className="muted small">
          Created <LocalTime date={note.createdAt} withTime /> · Updated <LocalTime date={note.updatedAt} withTime />
        </p>
      </div>
      <NoteEditor
        key={note.id}
        note={note}
        allTags={tags.map(({ id, name }) => ({ id, name }))}
        justSaved={param(await searchParams, "saved") === "1"}
      />
    </>
  );
}
