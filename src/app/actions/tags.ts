"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { AppError, NotFoundError } from "@/lib/errors";
import { text, toFormState, type FormState } from "@/lib/formState";
import type { TagRef } from "@/lib/services/tagging";
import { createTag, deleteTag, renameTag } from "@/lib/services/tags";

/** F7: add a tag from the Tags page. */
export async function createTagAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  try {
    await createTag(user.id, { name: text(formData, "name") });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tags");
  return { ok: true, savedAt: Date.now() };
}

/** F8 FR-9: create a tag from inside the tag picker. */
export async function createTagInline(name: string): Promise<{ tag?: TagRef; error?: string }> {
  const user = await requireUser();
  try {
    return { tag: await createTag(user.id, { name }) };
  } catch (error) {
    if (error instanceof AppError) return { error: error.errors?.name?.[0] ?? error.detail ?? error.title };
    throw error;
  }
}

/** F7: rename a tag. */
export async function renameTagAction(tagId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  try {
    await renameTag(user.id, tagId, { name: text(formData, "name") });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tags");
  return { ok: true, savedAt: Date.now() };
}

/** F7: delete a tag (notes and links keep existing). */
export async function deleteTagAction(tagId: number): Promise<void> {
  const user = await requireUser();
  try {
    await deleteTag(user.id, tagId);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }
  revalidatePath("/tags");
}
