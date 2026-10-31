import type { Dashboard } from "../../server/services/dashboard";
import type { Link } from "../../server/services/links";
import type { Note, NoteSummary } from "../../server/services/notes";
import type { TagWithCounts } from "../../server/services/tags";
import type { TagRef } from "../../server/services/tagging";
import type { User } from "../../server/services/users";
import type { FieldErrors } from "../../server/errors";

export type { Dashboard, FieldErrors, Link, Note, NoteSummary, TagRef, TagWithCounts, User };

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const BASE = `${basePath}/`;

/** App URL for a path like "/notes/". */
export const href = (path: string) => `${basePath}${path}`;

export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    detail: string,
    readonly errors?: FieldErrors,
    readonly code?: string,
  ) {
    super(detail);
  }
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(href(`/api${path}`), {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiProblem(0, "Can't reach the server. Check your connection and try again.");
  }
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (response.ok) return data as T;
  const firstError = data?.errors && Object.values(data.errors as FieldErrors)[0]?.[0];
  throw new ApiProblem(response.status, firstError ?? data?.detail ?? "Something went wrong.", data?.errors, data?.code);
}

let redirecting = false;

/**
 * Sends a request from a private page. A 401 goes to the login page and never
 * resolves. Islands load at the same time, and the first 401 clears the cookie,
 * so only that first response knows whether the session expired.
 */
async function authed<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await send<T>(method, path, body);
  } catch (error) {
    if (error instanceof ApiProblem && error.status === 401) {
      if (!redirecting) {
        redirecting = true;
        const params = new URLSearchParams({ returnUrl: location.pathname + location.search });
        if (error.code === "session_expired") params.set("expired", "1");
        location.assign(`${href("/login/")}?${params}`);
      }
      return new Promise<T>(() => {});
    }
    throw error;
  }
}

function listQuery(filters: { q?: string; tagId?: number }): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.tagId) params.set("tagId", String(filters.tagId));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type ListFilters = { q?: string; tagId?: number };
export type NoteInput = { title: string; content: string; tagIds: number[] };
export type LinkInput = { url: string; title: string; description: string; tagIds: number[] };

let me: Promise<User> | undefined;

export const api = {
  session: () => send<{ user: User | null }>("GET", "/auth/session"),
  register: (body: { name: string; email: string; password: string }) => send<User>("POST", "/auth/register", body),
  login: (body: { email: string; password: string }) => send<{ user: User }>("POST", "/auth/login", body),
  logout: () => send<void>("POST", "/auth/logout"),

  /** Shared across islands so a page asks for the user once. */
  me: () => (me ??= authed<User>("GET", "/auth/me")),
  updateProfile: (body: { name: string; email: string }) => authed<User>("PUT", "/auth/me", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    authed<void>("PUT", "/auth/me/password", body),

  notes: (filters: ListFilters = {}) => authed<NoteSummary[]>("GET", `/notes${listQuery(filters)}`),
  note: (id: number) => authed<Note>("GET", `/notes/${id}`),
  createNote: (body: NoteInput) => authed<Note>("POST", "/notes", body),
  updateNote: (id: number, body: NoteInput) => authed<Note>("PUT", `/notes/${id}`, body),
  deleteNote: (id: number) => authed<void>("DELETE", `/notes/${id}`),

  links: (filters: ListFilters = {}) => authed<Link[]>("GET", `/links${listQuery(filters)}`),
  link: (id: number) => authed<Link>("GET", `/links/${id}`),
  createLink: (body: LinkInput) => authed<Link>("POST", "/links", body),
  updateLink: (id: number, body: LinkInput) => authed<Link>("PUT", `/links/${id}`, body),
  deleteLink: (id: number) => authed<void>("DELETE", `/links/${id}`),

  tags: () => authed<TagWithCounts[]>("GET", "/tags"),
  createTag: (name: string) => authed<TagRef>("POST", "/tags", { name }),
  renameTag: (id: number, name: string) => authed<TagRef>("PUT", `/tags/${id}`, { name }),
  deleteTag: (id: number) => authed<void>("DELETE", `/tags/${id}`),

  dashboard: () => authed<Dashboard>("GET", "/dashboard"),
};
