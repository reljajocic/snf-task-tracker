-- Moodboards: one whiteboard per project (Excalidraw scene). The team edits it live; the client
-- can see or edit it in the portal when the board allows it. Elements are merged per element by
-- version on every save, so people working at the same time don't overwrite each other.
create table public.boards (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null unique references public.projects (id) on delete cascade,
  elements       jsonb not null default '[]'::jsonb,
  files          jsonb not null default '{}'::jsonb,   -- file id -> { url, mimeType } (images in Storage)
  client_access  text not null default 'none' check (client_access in ('none', 'view', 'edit')),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null
);

-- The client's team and the project's members work on its board (the same people who work on the project).
create function public.can_use_project_board(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and (public.is_client_team(p.client_id) or public.is_project_member(pid))
  );
$$;
create function public.can_use_board(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.boards b where b.id = bid and public.can_use_project_board(b.project_id));
$$;
grant execute on function public.can_use_project_board(uuid) to authenticated, service_role;
grant execute on function public.can_use_board(uuid) to authenticated, service_role;

alter table public.boards enable row level security;
create policy "boards: read" on public.boards for select to authenticated using (public.can_use_project_board(project_id));
create policy "boards: create" on public.boards for insert to authenticated with check (public.can_use_project_board(project_id));
create policy "boards: update" on public.boards for update to authenticated
  using (public.can_use_project_board(project_id)) with check (public.can_use_project_board(project_id));
grant select, insert, update on public.boards to authenticated;
grant select, insert, update on public.boards to service_role;

-- Save: merge incoming elements into the stored scene (per element id the higher version wins,
-- ties broken by the lower versionNonce, like Excalidraw's own reconcile), add new image files,
-- and return the merged scene. Runs as the caller, so RLS decides who may save.
create function public.board_merge(bid uuid, incoming jsonb, new_files jsonb default '{}'::jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  merged jsonb;
begin
  perform 1 from public.boards where id = bid for update;
  if not found then raise exception 'Board not found'; end if;
  update public.boards b
     set elements = (
           select coalesce(jsonb_agg(x.e order by x.e->>'index' collate "C" nulls last, x.id), '[]'::jsonb)
             from (
               select distinct on (a.id) a.id, a.e
                 from (
                   select e->>'id' as id, e from jsonb_array_elements(b.elements) e
                   union all
                   select e->>'id' as id, e from jsonb_array_elements(coalesce(incoming, '[]'::jsonb)) e
                 ) a
                where a.id is not null
                order by a.id, coalesce((a.e->>'version')::bigint, 0) desc, coalesce((a.e->>'versionNonce')::bigint, 0) asc
             ) x
         ),
         files = b.files || coalesce(new_files, '{}'::jsonb),
         updated_at = now(),
         updated_by = auth.uid()
   where b.id = bid
  returning b.elements into merged;
  if merged is null then raise exception 'Not allowed'; end if;
  return merged;
end;
$$;
grant execute on function public.board_merge(uuid, jsonb, jsonb) to authenticated, service_role;

-- Live editing (Supabase Realtime, private channel "board:<id>"): only people who can use the board.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    execute $p$create policy "boards: live read" on realtime.messages for select to authenticated
      using (realtime.topic() like 'board:%' and public.can_use_board(nullif(split_part(realtime.topic(), ':', 2), '')::uuid))$p$;
    execute $p$create policy "boards: live write" on realtime.messages for insert to authenticated
      with check (realtime.topic() like 'board:%' and public.can_use_board(nullif(split_part(realtime.topic(), ':', 2), '')::uuid))$p$;
  end if;
end $$;

-- Images on boards: a public bucket, uploaded by the app's server after checking access.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('boards', 'boards', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
    on conflict (id) do nothing;
  end if;
end $$;
