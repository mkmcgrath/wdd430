# Personal Knowledge Vault

WDD 430 class project: a web app for saving notes and links, organizing them with tags, and searching them.

This branch (`bakeoff02`) is **Bakeoff 2**, the same project rebuilt on a **static rendering** architecture. The project specification is in [`project_spec.txt`](project_spec.txt).

## Stack

| Part | Choice |
|---|---|
| Framework | **Astro 7** in static mode, with **Preact** islands for the interactive parts |
| API | **Hono** on Node.js, bundled into a single file with esbuild |
| Database | **SQLite** through Node's built-in `node:sqlite` module |
| Auth | scrypt password hashes; random session tokens stored hashed in SQLite, sent in an httpOnly, SameSite=Strict cookie |
| Validation | zod on the API, with field errors shown next to each input |
| Tests | Vitest (API routes against an in-memory SQLite database) |
| Styling | Plain CSS with custom properties, mobile-first (`src/styles/global.css`) |

## How static rendering works here

`npm run build` turns every page into plain HTML ahead of time. There is no server rendering. A static host serves those files, and only one small service runs alongside them for accounts and data.

```
Browser ── /vault/*      ──> static files in dist/
        └─ /vault/api/*  ──> Hono API ──> SQLite
```

- **Static shell:** the page frame, headings, and loading placeholders are in the HTML.
- **Islands:** `client:load` components hydrate in the browser, then fetch the signed-in user's data from the API.
- **Private pages:** the build can't know anyone's notes, so one static page serves every note. The ID goes in the query string, as in `/vault/notes/view/?id=12`.
- **Page protection:** the HTML shells are public and contain no user data. The API enforces access, and pages redirect to login when it answers 401.

## Features

- **Accounts:** register, sign in, sign out. Private pages redirect to `/login/?returnUrl=…`. Sign-in is limited to 5 attempts per minute.
- **Notes:** create, view, edit, and delete plain-text notes. The browser warns before you leave with unsaved changes.
- **Links:** save `http`/`https` URLs with an optional title and description. Links open in a new tab.
- **Tags:** private per user and unique ignoring case. Rename them, delete them, and see how many notes and links use each one.
- **Tagging and filters:** add up to 10 tags per item, and create new tags from inside the editor. Clicking a tag chip filters the list.
- **Search:** case-insensitive search of titles, content, URLs, and descriptions, from the header or within each list. Search combines with the tag filter.
- **Dashboard:** recent notes and links, top tags, vault counts, and quick actions.
- **Profile:** change your name and email, or change your password. Changing your password signs out your other sessions.
- **Responsive:** tested at 360, 768, and 1280px. Navigation collapses behind a Menu button below 640px.

## Getting started

Requires Node.js 22.23 or newer (`.nvmrc` pins 26) and npm.

```bash
npm install
npm run dev        # http://localhost:4321/vault/
```

The dev command starts Astro and the API together. The database is created at `data/vault.db` the first time the API starts. Settings are optional, and `.env.example` lists them.

To run the real static build instead of the dev server:

```bash
npm run preview    # http://127.0.0.1:8493/vault/
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Astro and the API with live reload |
| `npm run build` | Build the static site to `dist/` and the API to `dist-server/index.mjs` |
| `npm start` | Run the built API |
| `npm run preview` | Build, then serve the site and API together from one process |
| `npm test` | Run the Vitest suite |
| `npm run check` | Type-check the project |

## Project layout

```
src/pages/          Static pages (one file per URL)
src/layouts/        Page frames
src/components/     Preact islands
src/lib/            Browser helpers: API client and hooks
src/styles/         Shared CSS
server/app.ts       API routes
server/db.ts        SQLite connection, schema, and migrations
server/auth.ts      Password hashing, sessions, rate limiting
server/validation.ts  zod schemas and validation limits
server/services/    All database access; every query is scoped to the user
tests/              API tests
```

## JSON API

All paths start with `/vault/api`. Everything except `health`, `register`, `login`, `logout`, and `session` needs a session cookie. Errors use RFC 9457 `application/problem+json`, with field errors under `errors`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/auth/register` | `{ name, email, password }` → 201 |
| POST | `/auth/login` | `{ email, password }` → `{ expiresAt, user }` + cookie |
| POST | `/auth/logout` | Ends the session and clears the cookie |
| GET | `/auth/session` | `{ user }`, or `{ user: null }` when signed out |
| GET / PUT | `/auth/me` | Current user / update `{ name, email }` |
| PUT | `/auth/me/password` | `{ currentPassword, newPassword }` → 204 |
| GET / POST | `/notes` | List (`?q=`, `?tagId=`) / create `{ title, content, tagIds? }` |
| GET / PUT / DELETE | `/notes/:id` | Another user's note returns 404 |
| GET / POST | `/links` | List (`?q=`, `?tagId=`) / create `{ url, title?, description?, tagIds? }` |
| GET / PUT / DELETE | `/links/:id` | |
| GET / POST | `/tags` | List with `noteCount`/`linkCount` / create `{ name }` |
| PUT / DELETE | `/tags/:id` | Rename / delete (notes and links are kept) |
| GET | `/dashboard` | Recent notes and links, top tags, counts |

On `PUT`, leaving out `tagIds` keeps an item's tags as they are, and `tagIds: []` removes them all.

## Compared with Bakeoff 1

| | Bakeoff 1 | Bakeoff 2 |
|---|---|---|
| Rendering | Server-rendered on each request | Pre-built static HTML plus islands |
| Data on first paint | Included in the HTML | Fetched after the page loads, with a loading placeholder |
| Note URLs | `/notes/12` | `/vault/notes/view/?id=12` |
| Forms | Server Actions | `fetch` calls to the JSON API |
| Database access | Prisma | SQL through `node:sqlite` |
| Sign out | Clears the cookie; a copied token works until it expires | Deletes the session on the server |
| Leaving with unsaved edits | Doesn't warn on in-app links | Warns, because every page change is a full navigation |

## Known prototype limits

- SQLite search is case-insensitive for ASCII letters only.
- The rate limiters are in memory, so they only work with a single API process.
- Each private page shows a loading placeholder until its data arrives.
