import { useRef, useState } from "preact/hooks";
import { api, type User } from "../lib/api";
import { useResource, useSubmit } from "../lib/hooks";
import { FieldError, Flash, FormError, invalidProps, LoadError, LoadingCards, LocalTime, SubmitButton } from "./ui";

export function ProfilePage() {
  const { data: user, error } = useResource("me", api.me);

  if (error) return <LoadError problem={error} />;
  if (!user) return <LoadingCards count={2} />;
  return (
    <div class="stack">
      <AccountDetails user={user} />
      <ChangePasswordForm />
    </div>
  );
}

function AccountDetails({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);
  const { pending, errors, setErrors, submit } = useSubmit();
  const editButton = useRef<HTMLButtonElement>(null);

  function startEditing() {
    setName(user.name);
    setEmail(user.email);
    setSaved(false);
    setEditing(true);
  }

  function stopEditing() {
    setEditing(false);
    setErrors(undefined);
    setTimeout(() => editButton.current?.focus(), 0);
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    submit(async () => {
      const updated = await api.updateProfile({ name, email });
      setUser(updated);
      setSaved(true);
      setEditing(false);
      dispatchEvent(new CustomEvent("vault:user", { detail: updated }));
    });
  }

  return (
    <section class="card stack" aria-labelledby="account-heading">
      <h2 id="account-heading">Account details</h2>
      <div aria-live="polite">{saved && !editing && <Flash message="Profile updated." />}</div>

      {editing ? (
        <form class="form" onSubmit={onSubmit}>
          <FormError errors={errors} />
          <div class="field">
            <label for="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              value={name}
              autoFocus
              onInput={(event) => setName(event.currentTarget.value)}
              {...invalidProps(errors, "name", "profile-name-error")}
            />
            <FieldError errors={errors} name="name" id="profile-name-error" />
          </div>
          <div class="field">
            <label for="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onInput={(event) => setEmail(event.currentTarget.value)}
              {...invalidProps(errors, "email", "profile-email-error")}
            />
            <FieldError errors={errors} name="email" id="profile-email-error" />
          </div>
          <div class="actions">
            <SubmitButton pending={pending} pendingText="Saving…">
              Save
            </SubmitButton>
            <button type="button" class="btn" onClick={stopEditing}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl class="stack-sm" style={{ margin: 0 }}>
            <div>
              <dt class="label">Name</dt>
              <dd class="wrap-anywhere" style={{ margin: 0 }}>
                {user.name}
              </dd>
            </div>
            <div>
              <dt class="label">Email</dt>
              <dd class="wrap-anywhere" style={{ margin: 0 }}>
                {user.email}
              </dd>
            </div>
            <div>
              <dt class="label">Member since</dt>
              <dd style={{ margin: 0 }}>
                <LocalTime date={user.createdAt} />
              </dd>
            </div>
          </dl>
          <div class="actions">
            <button ref={editButton} type="button" class="btn" onClick={startEditing}>
              Edit
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** A wrong current password shows a field error and keeps you signed in. */
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const { pending, errors, setErrors, submit } = useSubmit();

  function onSubmit(event: Event) {
    event.preventDefault();
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: ["Passwords don't match."] });
      return;
    }
    submit(async () => {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    });
  }

  return (
    <section class="card stack" aria-labelledby="password-heading">
      <h2 id="password-heading">Change password</h2>
      <div aria-live="polite">{saved && <Flash message="Password changed." />}</div>
      <form class="form" onSubmit={onSubmit}>
        <FormError errors={errors} />
        <div class="field">
          <label for="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onInput={(event) => setCurrentPassword(event.currentTarget.value)}
            {...invalidProps(errors, "currentPassword", "current-password-error")}
          />
          <FieldError errors={errors} name="currentPassword" id="current-password-error" />
        </div>
        <div class="field">
          <label for="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={newPassword}
            onInput={(event) => setNewPassword(event.currentTarget.value)}
            {...invalidProps(errors, "newPassword", "new-password-error")}
          />
          <FieldError errors={errors} name="newPassword" id="new-password-error" />
        </div>
        <div class="field">
          <label for="confirm-new-password">Confirm new password</label>
          <input
            id="confirm-new-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onInput={(event) => setConfirmPassword(event.currentTarget.value)}
            {...invalidProps(errors, "confirmPassword", "confirm-new-password-error")}
          />
          <FieldError errors={errors} name="confirmPassword" id="confirm-new-password-error" />
        </div>
        <div class="actions">
          <SubmitButton pending={pending} pendingText="Changing…">
            Change password
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
