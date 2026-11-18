-- The team's notes on a client (brand and tone, likes and dislikes, contacts and agreements, links):
-- short pages of text on the client's Docs tab. Files stay on Drive/Dropbox; a page only links to them.
-- Everyone who can see the client reads them (an editor on one of its videos too); the client's team writes them.
-- Never shown in the client portal.
create table public.client_docs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 120),
  body        text not null default '' check (length(body) <= 50000),
  position    int not null default 0,
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index client_docs_client_idx on public.client_docs (client_id, position);
alter table public.client_docs enable row level security;

-- Who changed it last and when, stamped by the database (the app can't claim someone else wrote it).
create function public.client_docs_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger client_docs_stamp before insert or update on public.client_docs
  for each row execute function public.client_docs_stamp();

create policy "client_docs: read on visible clients" on public.client_docs for select to authenticated
  using (public.can_view_client(client_id));
create policy "client_docs: team writes" on public.client_docs for insert to authenticated
  with check (public.is_client_team(client_id));
create policy "client_docs: team edits" on public.client_docs for update to authenticated
  using (public.is_client_team(client_id)) with check (public.is_client_team(client_id));
create policy "client_docs: team deletes" on public.client_docs for delete to authenticated
  using (public.is_client_team(client_id));

grant select, insert, update, delete on public.client_docs to authenticated;
grant select on public.client_docs to service_role;
