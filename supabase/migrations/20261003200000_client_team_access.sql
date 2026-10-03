-- "Everyone on a client can do everything for that client" (owner's call).
-- Anyone in client_members (manager or member) sees and edits all of that client's tasks,
-- videos and shoot days. Managers additionally run projects, the portal and client settings;
-- admins assign people to clients. Personal tasks stay private.

create function public.is_client_team(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.client_members
    where client_id = cid and user_id = (select auth.uid())
  );
$$;
grant execute on function public.is_client_team(uuid) to authenticated, service_role;

create or replace function public.task_visible(tid uuid, creator uuid, cid uuid, pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or creator = (select auth.uid())
    or (cid is not null and public.is_client_team(cid))
    or (pid is not null and public.is_project_member(pid))
    or public.is_task_assignee(tid);
$$;

create or replace function public.task_editable(tid uuid, creator uuid, cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or creator = (select auth.uid())
    or (cid is not null and public.is_client_team(cid))
    or public.is_task_assignee(tid);
$$;

create or replace function public.can_create_task_in(cid uuid, pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when cid is null and pid is null then true
    when pid is not null then public.is_project_member(pid) or public.is_client_team(cid)
    else public.is_client_team(cid)
  end;
$$;

-- Shoot days and crew: the whole client team.
drop policy "shoot_days: write" on public.shoot_days;
create policy "shoot_days: write" on public.shoot_days for all to authenticated
  using (public.is_client_team(client_id)) with check (public.is_client_team(client_id));
drop policy "shoot_crew: write" on public.shoot_crew;
create policy "shoot_crew: write" on public.shoot_crew for all to authenticated
  using (exists (select 1 from public.shoot_days s where s.id = shoot_id and public.is_client_team(s.client_id)))
  with check (exists (select 1 from public.shoot_days s where s.id = shoot_id and public.is_client_team(s.client_id)));

-- Delete rights follow edit rights for client work.
drop policy "tasks: delete" on public.tasks;
create policy "tasks: delete" on public.tasks for delete to authenticated
  using (public.is_admin()
         or created_by = (select auth.uid())
         or (client_id is not null and public.is_client_team(client_id)));

-- The client's regular editor gets edit work when videos are scheduled.
alter table public.clients add column default_editor_id uuid references public.profiles (id) on delete set null;

-- Where the day's footage is uploaded (for the editor).
alter table public.shoot_days add column drive_url text;
