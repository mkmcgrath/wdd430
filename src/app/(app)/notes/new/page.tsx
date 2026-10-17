import type { Metadata } from "next";
import { NoteEditor } from "@/components/NoteEditor";
import { requireUser } from "@/lib/auth/session";
import { listTags } from "@/lib/services/tags";

export const metadata: Metadata = { title: "New note" };

export default async function NewNotePage() {
  const user = await requireUser();
  const tags = await listTags(user.id);
  return (
    <>
      <div className="page-header">
        <h1>New note</h1>
      </div>
      <NoteEditor allTags={tags.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
