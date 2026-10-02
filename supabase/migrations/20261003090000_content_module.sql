-- Phase 2: content module (videos, posting schedule, shoot days).
--
-- A video is a task with kind = 'video' that moves through phases:
--   0 script → 1 shoot → 2 edit → 3 revision → 4 publish → 5 published.
-- Subtasks (kind = 'subtask', parent_id) carry work done by someone else.

-- Per-client content settings -----------------------------------------------
alter table public.clients
  add column content_types text[] not null default '{FUN,INFO,GYM,UGC,PROMO}',
  add column posting_days smallint[] not null default '{0,2,4}';  -- 0 = Monday … 6 = Sunday

-- Shoot days ----------------------------------------------------------------
create table public.shoot_days (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  date        date not null,
  location    text,
  starts_at   time,
  ends_at     time,
  notes       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index shoot_days_client_idx on public.shoot_days (client_id, date);

create table public.shoot_crew (
  shoot_id   uuid not null references public.shoot_days (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  primary key (shoot_id, user_id)
);

-- Video fields on tasks -----------------------------------------------------
alter table public.tasks
  add column phase smallint check (phase between 0 and 5),
  add column content_type text,
  add column on_camera text,
  add column location text,
  add column script jsonb not null default '[]',      -- [{ "label": "Hook", "text": "…" }, …]
  add column reference_url text,
  add column note text,
  add column publish_date date,
  add column published_at date,
  add column shoot_id uuid references public.shoot_days (id) on delete set null,
  add column shoot_time text check (shoot_time is null or shoot_time ~ '^\d{2}:\d{2}$'),
  add column shoot_order integer,
  add column shot_status text check (shot_status in ('to_shoot', 'shot', 'not_shot'));

create index tasks_publish_idx on public.tasks (client_id, publish_date) where kind = 'video';
create index tasks_shoot_idx on public.tasks (shoot_id);

-- Access helpers ------------------------------------------------------------
create function public.is_shoot_crew(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select sid is not null and exists (
    select 1 from public.shoot_crew where shoot_id = sid and user_id = (select auth.uid())
  );
$$;

-- Crew on a shoot day sees the videos being shot that day.
drop policy "tasks: read" on public.tasks;
create policy "tasks: read" on public.tasks for select to authenticated
  using (public.task_visible(id, created_by, client_id, project_id) or public.is_shoot_crew(shoot_id));

create or replace function public.can_view_task(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.id = tid
      and (public.task_visible(t.id, t.created_by, t.client_id, t.project_id) or public.is_shoot_crew(t.shoot_id))
  );
$$;

alter table public.shoot_days enable row level security;
alter table public.shoot_crew enable row level security;

create policy "shoot_days: read" on public.shoot_days for select to authenticated
  using (public.can_view_client(client_id) or public.is_shoot_crew(id));
create policy "shoot_days: write" on public.shoot_days for all to authenticated
  using (public.is_client_manager(client_id)) with check (public.is_client_manager(client_id));

create policy "shoot_crew: read" on public.shoot_crew for select to authenticated
  using (exists (select 1 from public.shoot_days s where s.id = shoot_id
                 and (public.can_view_client(s.client_id) or public.is_shoot_crew(s.id))));
create policy "shoot_crew: write" on public.shoot_crew for all to authenticated
  using (exists (select 1 from public.shoot_days s where s.id = shoot_id and public.is_client_manager(s.client_id)))
  with check (exists (select 1 from public.shoot_days s where s.id = shoot_id and public.is_client_manager(s.client_id)));

grant select, insert, update, delete on public.shoot_days, public.shoot_crew to authenticated, service_role;
grant execute on function public.is_shoot_crew(uuid) to authenticated, service_role;

-- On set: crew (or anyone who can edit the video) marks it shot / not shot.
-- Marking "shot" moves the video to the edit phase.
create function public.mark_shot(tid uuid, new_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
begin
  if new_status not in ('to_shoot', 'shot', 'not_shot') then
    raise exception 'Invalid shot status';
  end if;
  select * into t from public.tasks where id = tid;
  if not found then raise exception 'Task not found'; end if;
  if not (public.can_edit_task(tid) or public.is_shoot_crew(t.shoot_id)) then
    raise exception 'Not allowed';
  end if;
  update public.tasks
     set shot_status = new_status,
         phase = case when new_status = 'shot' then greatest(coalesce(phase, 0), 2) else phase end
   where id = tid;
end;
$$;
grant execute on function public.mark_shot(uuid, text) to authenticated;

-- Keep phase and status in step for videos -----------------------------------
create or replace function public.tasks_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null then
    select client_id, project_id into new.client_id, new.project_id
    from public.tasks where id = new.parent_id;
    new.kind := 'subtask';
  end if;

  if new.project_id is not null then
    select client_id into new.client_id from public.projects where id = new.project_id;
  end if;

  if new.kind = 'video' then
    new.phase := coalesce(new.phase, 0);
    new.shot_status := coalesce(new.shot_status, 'to_shoot');
    if tg_op = 'INSERT' or new.phase is distinct from old.phase then
      -- Phase drives status: revision waits on the client, published is done.
      if new.phase = 3 then
        new.status := 'waiting_client';
      elsif new.phase = 5 then
        new.status := 'done';
        new.published_at := coalesce(new.published_at, (now() at time zone 'Europe/Belgrade')::date);
      elsif tg_op = 'UPDATE' and new.status in ('waiting_client', 'done') then
        new.status := 'in_progress';
      end if;
    elsif new.status is distinct from old.status and new.status = 'done' and new.phase < 5 then
      -- Closing a video from the board means it's out.
      new.phase := 5;
      new.published_at := coalesce(new.published_at, (now() at time zone 'Europe/Belgrade')::date);
    end if;
    if new.phase < 5 then
      new.published_at := null;
    end if;
    -- Being put on a shoot day means the script is done.
    if new.shoot_id is not null and new.phase = 0 then
      new.phase := 1;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.status_changed_at := now();
    if new.status = 'done' then new.completed_at := now(); end if;
  else
    if (new.client_id is distinct from old.client_id or new.project_id is distinct from old.project_id)
       and (select auth.uid()) is not null
       and not public.can_create_task_in(new.client_id, new.project_id) then
      raise exception 'Not allowed to move this task to that client or project';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    if new.status is distinct from old.status then
      new.status_changed_at := now();
      new.completed_at := case when new.status = 'done' then now() else null end;
    end if;
  end if;
  return new;
end;
$$;
