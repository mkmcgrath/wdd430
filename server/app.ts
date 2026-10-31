import { Hono, type Context, type ErrorHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  createSession,
  deleteOtherSessions,
  deleteSession,
  loginLimiter,
  registerLimiter,
  SESSION_COOKIE,
  userIdForSession,
  type Session,
} from "./auth";
import { ApiError, notFound, tooManyRequests, unauthorized } from "./errors";
import { getDashboard } from "./services/dashboard";
import { createLink, deleteLink, getLink, listLinks, updateLink } from "./services/links";
import { createNote, deleteNote, getNote, listNotes, updateNote } from "./services/notes";
import { createTag, deleteTag, listTags, renameTag } from "./services/tags";
import {
  authenticate,
  changePassword,
  getUser,
  register,
  updateProfile,
  type User,
} from "./services/users";

export const API_BASE = "/vault/api";

const COOKIE_PATH = "/vault";

type Env = { Variables: { user: User; sessionToken: string } };

/** Caddy replaces X-Forwarded-For, and the API only listens on loopback, so this can't be spoofed. */
function clientIp(c: Context): string {
  return c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}

function writeSessionCookie(c: Context, session: Session) {
  setCookie(c, SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: process.env.NODE_ENV === "production",
    path: COOKIE_PATH,
    expires: new Date(session.expiresAt),
  });
}

function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: COOKIE_PATH });
}

/** Requiring JSON means a plain cross-site form can't reach these routes. */
async function readJson(c: Context): Promise<unknown> {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "Unsupported media type", "Send the request body as JSON.");
  }
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON", "The request body isn't valid JSON.");
  }
}

function parseId(value: string): number {
  const id = /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id)) throw notFound();
  return id;
}

const requireUser = createMiddleware<Env>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) throw unauthorized();

  const userId = userIdForSession(token);
  const user = userId === null ? null : getUser(userId);
  if (!user) {
    clearSessionCookie(c);
    throw unauthorized("session_expired");
  }
  c.set("user", user);
  c.set("sessionToken", token);
  await next();
});

export const app = new Hono<Env>().basePath(API_BASE);

app.use(async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
});

app.use(
  bodyLimit({
    maxSize: 128 * 1024,
    onError: () => {
      throw new ApiError(413, "Request too large", "The request body is too large.");
    },
  }),
);

export const handleError: ErrorHandler = (error, c) => {
  const body =
    error instanceof ApiError
      ? {
          type: "about:blank",
          title: error.title,
          status: error.status,
          detail: error.detail,
          ...(error.errors && { errors: error.errors }),
          ...(error.code && { code: error.code }),
        }
      : { type: "about:blank", title: "Internal server error", status: 500, detail: "Something went wrong." };
  if (!(error instanceof ApiError)) console.error(error);

  return c.body(JSON.stringify(body), body.status as ApiError["status"], {
    "Content-Type": "application/problem+json",
  });
};

app.onError(handleError);

app.notFound(() => {
  throw notFound("This endpoint doesn't exist.");
});

app.get("/health", (c) => c.json({ status: "ok" }));

// ---------- Auth ----------

app.post("/auth/register", async (c) => {
  if (!registerLimiter.attempt(clientIp(c))) {
    throw tooManyRequests("Too many sign-ups. Try again in a minute.");
  }
  return c.json(await register(await readJson(c)), 201);
});

app.post("/auth/login", async (c) => {
  if (!loginLimiter.attempt(clientIp(c))) {
    throw tooManyRequests("Too many sign-in attempts. Try again in a minute.");
  }
  const user = await authenticate(await readJson(c));
  const session = createSession(user.id);
  writeSessionCookie(c, session);
  return c.json({ expiresAt: session.expiresAt, user });
});

app.post("/auth/logout", (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) deleteSession(token);
  clearSessionCookie(c);
  return c.body(null, 204);
});

// Lets public pages ask "am I signed in?" without treating no as an error.
app.get("/auth/session", (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  const userId = token ? userIdForSession(token) : null;
  return c.json({ user: userId === null ? null : getUser(userId) });
});

const account = new Hono<Env>();
account.use(requireUser);
account.get("/", (c) => c.json(c.get("user")));
account.put("/", async (c) => c.json(updateProfile(c.get("user").id, await readJson(c))));
account.put("/password", async (c) => {
  const user = c.get("user");
  await changePassword(user.id, await readJson(c));
  deleteOtherSessions(user.id, c.get("sessionToken"));
  return c.body(null, 204);
});
app.route("/auth/me", account);

// ---------- Notes ----------

const notes = new Hono<Env>();
notes.use(requireUser);
notes.get("/", (c) => c.json(listNotes(c.get("user").id, c.req.query())));
notes.post("/", async (c) => {
  const note = createNote(c.get("user").id, await readJson(c));
  c.header("Location", `${API_BASE}/notes/${note.id}`);
  return c.json(note, 201);
});
notes.get("/:id", (c) => c.json(getNote(c.get("user").id, parseId(c.req.param("id")))));
notes.put("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  return c.json(updateNote(c.get("user").id, id, await readJson(c)));
});
notes.delete("/:id", (c) => {
  deleteNote(c.get("user").id, parseId(c.req.param("id")));
  return c.body(null, 204);
});
app.route("/notes", notes);

// ---------- Links ----------

const links = new Hono<Env>();
links.use(requireUser);
links.get("/", (c) => c.json(listLinks(c.get("user").id, c.req.query())));
links.post("/", async (c) => {
  const link = createLink(c.get("user").id, await readJson(c));
  c.header("Location", `${API_BASE}/links/${link.id}`);
  return c.json(link, 201);
});
links.get("/:id", (c) => c.json(getLink(c.get("user").id, parseId(c.req.param("id")))));
links.put("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  return c.json(updateLink(c.get("user").id, id, await readJson(c)));
});
links.delete("/:id", (c) => {
  deleteLink(c.get("user").id, parseId(c.req.param("id")));
  return c.body(null, 204);
});
app.route("/links", links);

// ---------- Tags ----------

const tags = new Hono<Env>();
tags.use(requireUser);
tags.get("/", (c) => c.json(listTags(c.get("user").id)));
tags.post("/", async (c) => c.json(createTag(c.get("user").id, await readJson(c)), 201));
tags.put("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  return c.json(renameTag(c.get("user").id, id, await readJson(c)));
});
tags.delete("/:id", (c) => {
  deleteTag(c.get("user").id, parseId(c.req.param("id")));
  return c.body(null, 204);
});
app.route("/tags", tags);

// ---------- Dashboard ----------

app.get("/dashboard", requireUser, (c) => c.json(getDashboard(c.get("user").id)));
