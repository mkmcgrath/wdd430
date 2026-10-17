"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { text, toFormState, type FormState } from "@/lib/formState";
import { createLink, deleteLink, updateLink } from "@/lib/services/links";

function linkInput(formData: FormData) {
  return {
    url: text(formData, "url"),
    title: text(formData, "title"),
    description: text(formData, "description"),
    tagIds: formData.getAll("tagIds").map(String),
  };
}

/** F6: create (linkId = null) or update a link, then return to the list. */
export async function saveLinkAction(linkId: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  try {
    if (linkId === null) await createLink(user.id, linkInput(formData));
    else await updateLink(user.id, linkId, linkInput(formData));
  } catch (error) {
    return toFormState(error);
  }
  redirect("/links?saved=1");
}

/** F6: delete a link. */
export async function deleteLinkAction(linkId: number): Promise<void> {
  const user = await requireUser();
  try {
    await deleteLink(user.id, linkId);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }
  redirect("/links?deleted=1");
}
