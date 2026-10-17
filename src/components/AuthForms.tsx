"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { initialFormState } from "@/lib/formState";
import { FieldError, invalidProps } from "./FieldError";
import { SubmitButton } from "./SubmitButton";

/** Moves focus to the error summary after a failed submit (F2/F3 accessibility). */
function useFocusOnError(errors: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors) ref.current?.focus();
  }, [errors]);
  return ref;
}

/** F3 sign-in form. */
export function LoginForm({ returnUrl, defaultEmail }: { returnUrl?: string; defaultEmail?: string }) {
  const [state, formAction] = useActionState(loginAction, initialFormState);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const errorRef = useFocusOnError(state.errors);
  const errors = state.errors;
  const summary = errors?._?.[0] ?? (errors ? "Check the fields below." : undefined);

  return (
    <form action={formAction} className="form" noValidate>
      {summary && (
        <div ref={errorRef} tabIndex={-1} className="alert alert-error" role="alert">
          {summary}
        </div>
      )}
      {returnUrl && <input type="hidden" name="returnUrl" value={returnUrl} />}
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          {...invalidProps(errors, "email", "login-email-error")}
        />
        <FieldError errors={errors} name="email" id="login-email-error" />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        {/* Uncontrolled: React clears it after a failed attempt; the email is kept. */}
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          {...invalidProps(errors, "password", "login-password-error")}
        />
        <FieldError errors={errors} name="password" id="login-password-error" />
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <p className="muted small">Using a shared computer? Sign out when you&apos;re done.</p>
      <p>
        New here? <Link href="/register">Create an account</Link>
      </p>
    </form>
  );
}

/** F2 registration form. */
export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialFormState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const errors = mismatch ? { ...state.errors, confirmPassword: ["Passwords do not match"] } : state.errors;
  const errorRef = useFocusOnError(state.errors);
  const summary = state.errors?._?.[0] ?? (state.errors ? "Please fix the highlighted fields." : undefined);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // F2 FR-8: don't send the request when the passwords differ.
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) {
      event.preventDefault();
      setMismatch(true);
    } else {
      setMismatch(false);
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="form" noValidate>
      {summary && (
        <div ref={errorRef} tabIndex={-1} className="alert alert-error" role="alert">
          {summary}
        </div>
      )}
      <div className="field">
        <label htmlFor="register-name">Name</label>
        <input
          id="register-name"
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          {...invalidProps(errors, "name", "register-name-error")}
        />
        <FieldError errors={errors} name="name" id="register-name-error" />
      </div>
      <div className="field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          {...invalidProps(errors, "email", "register-email-error")}
        />
        <FieldError errors={errors} name="email" id="register-email-error" />
      </div>
      <div className="field">
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          aria-describedby="register-password-hint"
          {...invalidProps(errors, "password", "register-password-error")}
        />
        <p id="register-password-hint" className="hint">
          At least 8 characters.
        </p>
        <FieldError errors={errors} name="password" id="register-password-error" />
      </div>
      <div className="field">
        <label htmlFor="register-confirm">Confirm password</label>
        <input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          {...invalidProps(errors, "confirmPassword", "register-confirm-error")}
        />
        <FieldError errors={errors} name="confirmPassword" id="register-confirm-error" />
      </div>
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
