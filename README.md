# Personal Knowledge Vault

WDD 430 class project: a web app for saving notes and links, organizing them with tags, and searching them.

This branch (`bakeoff01`) is **Bakeoff 1**, a working prototype built with a meta framework (SSR/hybrid full-stack).

## Stack

| Part | Choice |
|---|---|
| Framework | **Next.js 16** (App Router): Server Components for pages, Server Actions for forms, Route Handlers for the JSON API |
| Database | **SQLite** through **Prisma 7** (`better-sqlite3` driver adapter) |
| Auth | argon2id password hashes; signed JWT (HS256, `jose`) in an httpOnly, SameSite=Lax cookie |
| Validation | zod (the same schemas validate API bodies and form data) |
| Tests | Vitest (API route handlers against a throwaway SQLite database) |
| Styling | Plain CSS with custom properties, mobile-first (`src/app/globals.css`) |

## Features

- **Accounts:** register, sign in, sign out. Protected pages redirect to `/login?returnUrl=…`. Sign-in is rate-limited to 5 attempts per minute.
- **Notes:** create, view, edit and delete plain-text notes. The editor warns before you leave with unsaved changes.
- **Links:** save `http`/`https` URLs with an optional title and description. Links open in a new tab.
- **Tags:** private per user and unique ignoring case. Rename them, delete them, and see how many notes and links use each one.
- **Tagging and filters:** add up to 10 tags per item, and create new tags from inside the editor. Clicking a tag chip filters the list.
- **Search:** case-insensitive search of titles, content, URLs and descriptions, from the header or within each list. Search combines with the tag filter.
- **Dashboard:** recent notes and links, top tags, vault counts, and quick actions.
- **Profile:** change your name and email, or change your password.
- **Responsive:** tested at 360, 768 and 1280px. Navigation collapses behind a Menu button below 640px.

## Getting started

Requires Node.js 22 or newer (`.nvmrc` pins 26) and npm.

```bash
npm install                      # also generates the Prisma client
cp .env.example .env             # then set JWT_SECRET (see below)
npm run db:migrate               # creates prisma/dev.db and applies migrations
npm run dev                      # http://localhost:3000
```

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Then open http://localhost:3000, create an account, and sign in.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Run the Vitest suite (uses its own `prisma/test.db`) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply migrations in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply existing migrations (production/CI) |

### Adding a migration

Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <what_changed>`. Commit the new folder under `prisma/migrations/`.

## Project layout

```
prisma/schema.prisma        Data model (users, notes, links, tags, note_tags, link_tags)
src/proxy.ts                Optimistic route guard (redirects signed-out visitors)
src/app/(auth)/             /login, /register
src/app/(app)/              Signed-in pages; layout.tsx is the app shell
src/app/actions/            Server Actions used by the forms
src/app/api/                JSON API (see below)
src/lib/services/           All database access; every query is scoped to the user
src/lib/validation/         zod schemas and validation limits
src/lib/auth/               Tokens, session cookie, password hashing, rate limiting
src/components/             UI components
tests/                      One test file per feature, tests named after acceptance criteria
```

## JSON API

All endpoints except `health`, `register` and `login` need a session cookie or an `Authorization: Bearer <token>` header. Errors use RFC 9457 `application/problem+json`. Field errors are under `errors`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{ "status": "ok" }` |
| POST | `/api/auth/register` | `{ name, email, password }` → 201 |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, expiresAt, user }` + cookie |
| POST | `/api/auth/logout` | Clears the cookie |
| GET / PUT | `/api/auth/me` | Current user / update `{ name, email }` |
| PUT | `/api/auth/me/password` | `{ currentPassword, newPassword }` → 204 |
| GET / POST | `/api/notes` | List (`?q=`, `?tagId=`) / create `{ title, content, tagIds? }` |
| GET / PUT / DELETE | `/api/notes/:id` | Another user's note returns 404 |
| GET / POST | `/api/links` | List (`?q=`, `?tagId=`) / create `{ url, title?, description?, tagIds? }` |
| GET / PUT / DELETE | `/api/links/:id` | |
| GET / POST | `/api/tags` | List with `noteCount`/`linkCount` / create `{ name }` |
| PUT / DELETE | `/api/tags/:id` | Rename / delete (notes and links are kept) |
| GET | `/api/dashboard` | Recent notes and links, top tags, counts |

On `PUT`, leaving out `tagIds` keeps an item's tags as they are, and `tagIds: []` removes them all.

## Known prototype limits

- SQLite search is case-insensitive for ASCII letters only. Moving to PostgreSQL means changing one line (`src/lib/services/search.ts`).
- Signing out clears the cookie, but a copied token stays valid until it expires (8 hours).
- The login rate limiter is in-memory, so it only works with a single server process.
- Not deployed yet. CI and Playwright tests aren't in the repo.

See [AI_USAGE.md](AI_USAGE.md) for how AI was used to build this.
