import { AppError, type FieldErrors } from "@/lib/errors";

/** What a server action hands back to a form rendered with useActionState. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  /** Bumps on every successful save so clients can react to it. */
  savedAt?: number;
};

export const initialFormState: FormState = {};

/** Turns a service error into form state; unexpected errors are re-thrown to the error boundary. */
export function toFormState(error: unknown): FormState {
  if (error instanceof AppError) {
    return { ok: false, errors: error.errors ?? { _: [error.detail ?? error.title] } };
  }
  throw error;
}

export function text(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}
