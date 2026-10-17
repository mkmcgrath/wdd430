"use client";

import { useActionState, useRef, useState } from "react";
import { changePasswordAction, updateProfileAction } from "@/app/actions/profile";
import { initialFormState } from "@/lib/formState";
import { FieldError, FormError, invalidProps } from "./FieldError";
import { LocalTime } from "./LocalTime";
import { SubmitButton } from "./SubmitButton";

type ProfileUser = { name: string; email: string; createdAt: string };

/** F4 "Account details": read view with an Edit button. */
export function AccountDetails({ user }: { user: ProfileUser }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(updateProfileAction, initialFormState);
  const [lastSavedAt, setLastSavedAt] = useState<number>();
  const editButton = useRef<HTMLButtonElement>(null);

  if (state.savedAt && state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setEditing(false);
  }

  function stopEditing() {
    setEditing(false);
    setTimeout(() => editButton.current?.focus(), 0);
  }

  return (
    <section className="card stack" aria-labelledby="account-heading">
      <h2 id="account-heading">Account details</h2>
      <div aria-live="polite">
        {state.ok && !editing && (
          <div className="alert alert-success" role="status">
            {state.message}
          </div>
        )}
      </div>

      {editing ? (
        <form action={formAction} className="form">
          <FormError errors={state.errors} />
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              name="name"
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              defaultValue={user.name}
              autoFocus
              {...invalidProps(state.errors, "name", "profile-name-error")}
            />
            <FieldError errors={state.errors} name="name" id="profile-name-error" />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              defaultValue={user.email}
              {...invalidProps(state.errors, "email", "profile-email-error")}
            />
            <FieldError errors={state.errors} name="email" id="profile-email-error" />
          </div>
          <div className="actions">
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
            <button type="button" className="btn" onClick={stopEditing}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="stack-sm" style={{ margin: 0 }}>
            <div>
              <dt className="label">Name</dt>
              <dd className="wrap-anywhere" style={{ margin: 0 }}>
                {user.name}
              </dd>
            </div>
            <div>
              <dt className="label">Email</dt>
              <dd className="wrap-anywhere" style={{ margin: 0 }}>
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="label">Member since</dt>
              <dd style={{ margin: 0 }}>
                <LocalTime date={user.createdAt} />
              </dd>
            </div>
          </dl>
          <div className="actions">
            <button ref={editButton} type="button" className="btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** F4 "Change password". A wrong current password shows a field error and keeps you signed in. */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialFormState);
  const errors = state.errors;
  // React resets the form's uncontrolled fields after every action; on success
  // that clears the passwords, which is what we want.
  return (
    <section className="card stack" aria-labelledby="password-heading">
      <h2 id="password-heading">Change password</h2>
      <div aria-live="polite">
        {state.ok && (
          <div className="alert alert-success" role="status">
            {state.message}
          </div>
        )}
      </div>
      <form action={formAction} className="form">
        <FormError errors={errors} />
        <div className="field">
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            {...invalidProps(errors, "currentPassword", "current-password-error")}
          />
          <FieldError errors={errors} name="currentPassword" id="current-password-error" />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            {...invalidProps(errors, "newPassword", "new-password-error")}
          />
          <FieldError errors={errors} name="newPassword" id="new-password-error" />
        </div>
        <div className="field">
          <label htmlFor="confirm-new-password">Confirm new password</label>
          <input
            id="confirm-new-password"
            name="confirmNewPassword"
            type="password"
            required
            autoComplete="new-password"
            {...invalidProps(errors, "confirmNewPassword", "confirm-new-password-error")}
          />
          <FieldError errors={errors} name="confirmNewPassword" id="confirm-new-password-error" />
        </div>
        <div className="actions">
          <SubmitButton pendingText="Changing…">Change password</SubmitButton>
        </div>
      </form>
    </section>
  );
}
