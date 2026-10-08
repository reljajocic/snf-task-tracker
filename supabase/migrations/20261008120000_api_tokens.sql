-- Personal keys for AI assistants (MCP): a key acts as the person who made it, through RLS.
-- Only a SHA-256 hash is stored; the key itself is shown once when it's created.
create table public.api_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null check (length(name) between 1 and 60),
  token_hash    text not null unique,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index api_tokens_user_idx on public.api_tokens (user_id);
alter table public.api_tokens enable row level security;
create policy "api_tokens: own read" on public.api_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "api_tokens: own create" on public.api_tokens for insert to authenticated with check (user_id = (select auth.uid()));
create policy "api_tokens: own delete" on public.api_tokens for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.api_tokens to authenticated;
-- The MCP endpoint looks a key up by its hash (before it knows who's calling) and stamps last use.
grant select, update on public.api_tokens to service_role;
