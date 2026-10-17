"use client";

import { useId, useRef } from "react";
import { SubmitButton } from "./SubmitButton";

/**
 * A button that opens a native modal <dialog> asking for confirmation. The
 * dialog traps focus, closes on Escape, and returns focus to the button.
 * Confirming submits `action` (a server action).
 */
export function ConfirmDialog({
  triggerLabel,
  triggerAriaLabel,
  triggerClassName = "btn btn-danger",
  title,
  message,
  confirmLabel = "Delete",
  action,
}: {
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  action: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-label={triggerAriaLabel}
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog ref={dialogRef} className="confirm" aria-labelledby={titleId}>
        <div className="stack">
          <h2 id={titleId}>{title}</h2>
          <p className="wrap-anywhere">{message}</p>
          <form action={action} className="actions">
            {/* Focus starts on Cancel, the safe choice. */}
            <button type="button" className="btn" autoFocus onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <SubmitButton className="btn btn-danger" pendingText="Deleting…">
              {confirmLabel}
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
