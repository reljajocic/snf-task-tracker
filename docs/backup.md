# Database backups

`.github/workflows/backup.yml` dumps the Supabase database every Sunday (and on demand),
encrypts it with `BACKUP_PASSPHRASE` and keeps it as a GitHub Actions artifact for 90 days.

## Setup (once)

1. Supabase → **Connect** → **Session pooler** → copy the URI and put the database password in it.
2. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = that URI
   - `BACKUP_PASSPHRASE` = a long random passphrase (save it in your password manager — without it a backup can't be opened)
3. **Actions → Weekly database backup → Run workflow** to test. The run should end green with a file `snf-db-<date>.tar.gz.gpg`.

## Restore

1. Actions → a backup run → **Artifacts** → download and unzip it.
2. Decrypt and unpack:
   ```bash
   gpg --decrypt snf-db-2026-10-11.tar.gz.gpg | tar -xzf -
   ```
   You get `public.sql` (all app tables and data) and `auth-users.sql` (sign-in accounts).
3. Into a fresh Supabase project (Connect → Session pooler URI):
   ```bash
   psql "<new project URI>" -f auth-users.sql
   psql "<new project URI>" -f public.sql
   ```
   Then point `.env.local` and Vercel at the new project.
