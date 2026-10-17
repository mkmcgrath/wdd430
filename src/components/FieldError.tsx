import type { FieldErrors } from "@/lib/errors";

/** First error message for a field, linked to its input via aria-describedby. */
export function FieldError({ errors, name, id }: { errors?: FieldErrors; name: string; id: string }) {
  const message = errors?.[name]?.[0];
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}

/** Props that mark an input invalid and point it at its error message. */
export function invalidProps(errors: FieldErrors | undefined, name: string, errorId: string) {
  return errors?.[name]?.length
    ? { "aria-invalid": true as const, "aria-describedby": errorId }
    : { "aria-invalid": false as const };
}

/** Form-level errors (key "_") shown in an alert above the form. */
export function FormError({ errors }: { errors?: FieldErrors }) {
  const messages = errors?._;
  if (!messages?.length) return null;
  return (
    <div className="alert alert-error" role="alert">
      {messages.join(" ")}
    </div>
  );
}
