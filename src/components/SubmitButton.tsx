"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself and swaps its label while the form's action runs. */
export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} {...rest}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
