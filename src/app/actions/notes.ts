"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { text, toFormState, type FormState } from "@/lib/formState";
import { createNote, deleteNote, updateNote } from "@/lib/services/notes";

function noteInput(formData: FormData) {
  return {
    title: text(formData, "title"),
    content: text(formData, "content") ?? "",
    // The editor always submits its full tag selection, so [] means "no tags".
    tagIds: formData.getAll("tagIds").map(String),
  };
}

/** F5: create (noteId = null) or update a note. */
export async function saveNoteAction(noteId: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  if (noteId === null) {
    let id: number;
    try {
      id = (await createNote(user.id, noteInput(formData))).id;
    } catch (error) {
      return toFormState(error);
    }
    redirect(`/notes/${id}?saved=1`);
  }

  try {
    await updateNote(user.id, noteId, noteInput(formData));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath(`/notes/${noteId}`);
  return { ok: true, message: "Saved.", savedAt: Date.now() };
}

/** F5: delete a note. Already-deleted counts as success ("already gone"). */
export async function deleteNoteAction(noteId: number): Promise<void> {
  const user = await requireUser();
  try {
    await deleteNote(user.id, noteId);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }
  redirect("/notes?deleted=1");
}
