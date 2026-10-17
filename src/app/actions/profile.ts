"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { text, toFormState, type FormState } from "@/lib/formState";
import { changePassword, updateProfile } from "@/lib/services/users";

/** F4: change name and email; the header picks up the new name on revalidate. */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  try {
    await updateProfile(user.id, { name: text(formData, "name"), email: text(formData, "email") });
  } catch (error) {
    return toFormState(error);
  }
  console.info(`profile updated id=${user.id}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated.", savedAt: Date.now() };
}

/** F4: change password (wrong current password → field error, never a sign-out). */
export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const newPassword = text(formData, "newPassword");
  if (newPassword !== text(formData, "confirmNewPassword")) {
    return { ok: false, errors: { confirmNewPassword: ["Passwords do not match"] } };
  }
  try {
    await changePassword(user.id, { currentPassword: text(formData, "currentPassword"), newPassword });
  } catch (error) {
    return toFormState(error);
  }
  console.info(`password changed id=${user.id}`);
  return { ok: true, message: "Password changed.", savedAt: Date.now() };
}
