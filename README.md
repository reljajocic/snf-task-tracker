# Slate 'n' Frame — task tracker

Internal tool for the Slate 'n' Frame team: tasks, clients and (later) content
planning, shoots and a client portal. The full product spec and the hi-fi
prototype live in [`docs/design/`](docs/design/README.md).

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4) · Supabase (Postgres,
auth, row level security) · Resend (email via Supabase SMTP) · Netlify (hosting).

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys (Supabase → Project Settings → API Keys)
npm run dev                  # http://localhost:3000
```

## Database

Migrations live in `supabase/migrations/` and are applied with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref tbjeopsteyqgarjuswzl
npm run db:push
```

`supabase/tests/rls.test.ts` runs every migration in an in-memory Postgres and
checks the access rules, so `npm test` catches permission mistakes before they
reach the real database.

### Access model

| Who | Sees | Edits |
| --- | --- | --- |
| Admin (`profiles.role = admin`) | everything | everything |
| Manager of a client (`client_members.role = manager`) | all of that client's projects and tasks | the same |
| Project member (`project_members`) | every task in the project | tasks they created or are assigned to |
| Anyone | their own personal tasks (no client/project) and tasks assigned to them | the same |

Only admins create clients and assign managers. Managers create projects and
staff them.

## Auth

Invite-only magic links. Nobody can sign up; an admin invites people from
**Team** (or `npm run invite -- --email … --name …` for the very first admin).
Emails use the templates in `supabase/templates/` and land on `/auth/confirm`.
The sign-in email also carries a one-time code, for the installed (PWA) app
where opening a link would leave the app.

## Conventions

- UI copy lives in `messages/en.json` (next-intl). Adding a language = a new
  messages file; no URL changes.
- Dates are `YYYY-MM-DD` strings, shown as `DD.MM.YYYY`; weeks start on Monday;
  "today" is always Belgrade time (`src/lib/dates.ts`).
- Design tokens are CSS variables in `src/app/globals.css`, exposed to
  Tailwind as `bg-surf`, `text-ink2`, `border-line` and so on. Dark theme is the
  default, light is `<html data-theme="light">`.

## Scripts

| | |
| --- | --- |
| `npm run dev` | dev server |
| `npm run lint` / `npm run typecheck` / `npm test` | what CI runs |
| `npm run db:push` | apply migrations to the linked Supabase project |
| `npm run db:types` | regenerate `src/lib/supabase/database.types.ts` |
| `npm run invite -- --email … --name … [--role admin]` | invite someone from the command line |
