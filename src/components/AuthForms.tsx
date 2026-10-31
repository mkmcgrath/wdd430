import { useEffect, useRef } from "preact/hooks";
import { api, BASE, href } from "../lib/api";
import { useSubmit, useUrlParams } from "../lib/hooks";
import { safeReturnUrl } from "../lib/returnUrl";
import { Flash, FieldError, FormError, invalidProps, SubmitButton } from "./ui";

const REGISTERED_EMAIL = "vault_registered_email";

function storedEmail(): string {
  try {
    const email = sessionStorage.getItem(REGISTERED_EMAIL) ?? "";
    sessionStorage.removeItem(REGISTERED_EMAIL);
    return email;
  } catch {
    return "";
  }
}

/**
 * These forms are on screen before their island hydrates, so people can type
 * before it's ready. Reading the fields on submit keeps that text, which state
 * updates from input events would miss.
 */
function fieldValue(form: HTMLFormElement, id: string): string {
  return (form.elements.namedItem(id) as HTMLInputElement).value;
}

function useRedirectIfSignedIn() {
  useEffect(() => {
    api.session().then(
      ({ user }) => {
        if (user) location.replace(href("/dashboard/"));
      },
      () => {},
    );
  }, []);
}

export function LoginForm() {
  useRedirectIfSignedIn();
  const params = useUrlParams();
  const { pending, errors, submit } = useSubmit();
  const emailInput = useRef<HTMLInputElement>(null);

  const registered = params?.has("registered");
  useEffect(() => {
    if (registered && emailInput.current) emailInput.current.value = storedEmail();
  }, [registered]);

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const body = { email: fieldValue(form, "email"), password: fieldValue(form, "password") };
    submit(async () => {
      await api.login(body);
      location.assign(safeReturnUrl(params?.get("returnUrl") ?? null, BASE) ?? href("/dashboard/"));
    });
  }

  return (
    <div class="stack">
      {registered && <Flash message="Account created. Please sign in." />}
      {params?.has("expired") && <Flash tone="info" message="Your session has expired. Please sign in again." />}
      <form class="form" onSubmit={onSubmit}>
        <FormError errors={errors} />
        <div class="field">
          <label for="email">Email</label>
          <input
            ref={emailInput}
            id="email"
            type="email"
            required
            autoComplete="email"
            {...invalidProps(errors, "email", "email-error")}
          />
          <FieldError errors={errors} name="email" id="email-error" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            {...invalidProps(errors, "password", "password-error")}
          />
          <FieldError errors={errors} name="password" id="password-error" />
        </div>
        <SubmitButton pending={pending} pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      <p>
        New here? <a href={href("/register/")}>Create an account</a>
      </p>
    </div>
  );
}

export function RegisterForm() {
  useRedirectIfSignedIn();
  const { pending, errors, setErrors, submit } = useSubmit();

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const password = fieldValue(form, "password");
    if (password !== fieldValue(form, "confirm")) {
      setErrors({ confirm: ["Passwords don't match."] });
      return;
    }
    const body = { name: fieldValue(form, "name"), email: fieldValue(form, "email"), password };
    submit(async () => {
      const user = await api.register(body);
      try {
        sessionStorage.setItem(REGISTERED_EMAIL, user.email);
      } catch {
        // Only pre-fills the email on the next page, so it's safe to skip.
      }
      location.assign(`${href("/login/")}?registered=1`);
    });
  }

  return (
    <div class="stack">
      <form class="form" onSubmit={onSubmit}>
        <FormError errors={errors} />
        <div class="field">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            {...invalidProps(errors, "name", "name-error")}
          />
          <FieldError errors={errors} name="name" id="name-error" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            {...invalidProps(errors, "email", "email-error")}
          />
          <FieldError errors={errors} name="email" id="email-error" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            {...invalidProps(errors, "password", "password-error")}
          />
          <p class="hint">At least 8 characters.</p>
          <FieldError errors={errors} name="password" id="password-error" />
        </div>
        <div class="field">
          <label for="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            {...invalidProps(errors, "confirm", "confirm-error")}
          />
          <FieldError errors={errors} name="confirm" id="confirm-error" />
        </div>
        <SubmitButton pending={pending} pendingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <p>
        Already have an account? <a href={href("/login/")}>Sign in</a>
      </p>
    </div>
  );
}
