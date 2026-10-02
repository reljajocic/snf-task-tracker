@AGENTS.md

# Project notes

- Spec and hi-fi prototype: `docs/design/README.md` and `docs/design/Task Tracker.dc.html`
  (serve the folder over http to view it; it needs `support.js`). The design is in Serbian,
  but the app UI is **English** — translate copy into `messages/en.json`, never hardcode strings.
- Display font is **Montserrat 900** (free stand-in for Uni Neue Black, which isn't licensed for web).
- Owner communicates in Serbian (latin script).
- Access rules live in SQL (RLS) in `supabase/migrations/`; every rule change needs a case in
  `supabase/tests/rls.test.ts`. Never use the secret-key client to work around RLS in user-facing code.
- Files stay on Google Drive; the app stores links only.
- Phases: 1 = tasks + clients + roles, 2 = video flow / posting schedule / shoots, 3 = client portal
  (secret link, no login).
