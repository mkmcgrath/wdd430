import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { ApiProblem, href, type FieldErrors, type TagRef } from "../lib/api";

export function invalidProps(errors: FieldErrors | undefined, name: string, id: string) {
  return errors?.[name] ? { "aria-invalid": true, "aria-describedby": id } : {};
}

export function FieldError({ errors, name, id }: { errors?: FieldErrors; name: string; id: string }) {
  const message = errors?.[name]?.[0];
  return message ? (
    <p id={id} class="field-error">
      {message}
    </p>
  ) : null;
}

export function FormError({ errors }: { errors?: FieldErrors }) {
  const message = errors?.form?.[0];
  return message ? (
    <div class="alert alert-error" role="alert">
      {message}
    </div>
  ) : null;
}

export function Flash({ tone = "success", message }: { tone?: "success" | "error" | "info"; message: string }) {
  return (
    <div class={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {message}
    </div>
  );
}

export function SubmitButton({
  pending,
  pendingText,
  children,
}: {
  pending: boolean;
  pendingText: string;
  children: ComponentChildren;
}) {
  return (
    <button type="submit" class="btn btn-primary" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div class="stack-sm" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} class="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export function LoadingPage() {
  return <div class="skeleton skeleton-page" aria-busy="true" aria-label="Loading" />;
}

/** Shows a failed load. A 404 becomes a friendly message with a way back. */
export function LoadError({
  problem,
  backHref,
  backLabel,
}: {
  problem: ApiProblem;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div class="card empty">
      <p class="wrap-anywhere">{problem.message}</p>
      {backHref && (
        <a href={backHref} class="btn">
          {backLabel}
        </a>
      )}
    </div>
  );
}

export function LocalTime({ date, withTime = false }: { date: string; withTime?: boolean }) {
  const parsed = new Date(date);
  return (
    <time dateTime={date}>
      {parsed.toLocaleString(undefined, {
        dateStyle: "medium",
        ...(withTime && { timeStyle: "short" }),
      })}
    </time>
  );
}

export function TagChips({ tags, basePath }: { tags: TagRef[]; basePath: "/notes/" | "/links/" }) {
  if (tags.length === 0) return null;
  return (
    <ul class="chips" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag.id}>
          <a class="chip" href={`${href(basePath)}?tag=${tag.id}`}>
            {tag.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ConfirmDialog({
  triggerLabel,
  triggerAriaLabel,
  title,
  message,
  onConfirm,
}: {
  triggerLabel: string;
  triggerAriaLabel?: string;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function confirm() {
    setPending(true);
    setError(undefined);
    try {
      await onConfirm();
      dialog.current?.close();
    } catch (problem) {
      setError((problem as ApiProblem).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        class="btn btn-danger"
        aria-label={triggerAriaLabel}
        onClick={() => dialog.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog ref={dialog} class="confirm" aria-label={title}>
        <div class="stack">
          <h2>{title}</h2>
          <p class="wrap-anywhere">{message}</p>
          {error && <Flash tone="error" message={error} />}
          <div class="actions">
            {/* Focus starts on Cancel, the safe choice. */}
            <button type="button" class="btn" autoFocus disabled={pending} onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="button" class="btn btn-danger" disabled={pending} onClick={confirm}>
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
