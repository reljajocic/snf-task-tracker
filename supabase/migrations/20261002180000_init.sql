-- Phase 1 schema: team, clients, projects, tasks, comments, notifications.
--
-- Access model
--   * profiles.role = 'admin'  → sees and edits everything.
--   * client_members.role = 'manager' → everything that belongs to that client.
--   * client_members.role = 'member'  → nothing by itself; access comes from project_members.
--   * project_members → sees every task of the project, edits only tasks they created or are assigned to.
--   * Personal tasks (no client, no project) → creator, assignees and admin only.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role       as enum ('admin', 'user');
create type public.client_role    as enum ('manager', 'member');
create type public.client_status  as enum ('active', 'prospect', 'paused', 'finished');
create type public.project_status as enum ('active', 'on_hold', 'completed', 'archived');
create type public.task_kind      as enum ('task', 'video', 'subtask');
create type public.task_status    as enum ('todo', 'in_progress', 'waiting_client', 'done');
create type public.task_priority  as enum ('low', 'medium', 'high', 'urgent');
create type public.task_type      as enum ('script', 'shoot', 'edit', 'revision', 'publish', 'meeting', 'admin', 'other');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  initials    text not null default '',
  avatar_bg   text not null default '#C3BFAE',
  avatar_fg   text not null default '#2F2D2E',
  role        public.app_role not null default 'user',
  locale      text not null default 'en',
  theme       text not null default 'dark' check (theme in ('dark', 'light')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  status      public.client_status not null default 'active',
  services    text[] not null default '{}',
  city        text,
  since       date,                       -- first day of the month the collaboration started
  email       text,
  instagram   text,
  locations   text[] not null default '{}',
  drive_url   text,
  notes       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.client_members (
  client_id   uuid not null references public.clients (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.client_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (client_id, user_id)
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  name        text not null,
  status      public.project_status not null default 'active',
  description text,
  starts_on   date,
  ends_on     date,
  drive_url   text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.project_members (
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  kind             public.task_kind not null default 'task',
  parent_id        uuid references public.tasks (id) on delete cascade,
  title            text not null check (length(trim(title)) > 0),
  description      text,
  client_id        uuid references public.clients (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  status           public.task_status not null default 'todo',
  priority         public.task_priority not null default 'medium',
  type             public.task_type,
  due_date         date,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0),
  drive_url        text,
  position         double precision not null default 0,   -- ordering inside a kanban column
  status_changed_at timestamptz not null default now(),   -- drives "waiting N days"
  completed_at     timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index tasks_client_idx  on public.tasks (client_id);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_parent_idx  on public.tasks (parent_id);
create index tasks_due_idx     on public.tasks (due_date) where status <> 'done';

create table public.task_assignees (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_assignees_user_idx on public.task_assignees (user_id);

create table public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);

create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- One row per (user, event, channel). A missing row means "use the default" (see notification code).
create table public.notification_preferences (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  event_type  text not null,
  channel     text not null default 'email',
  enabled     boolean not null default true,
  primary key (user_id, event_type, channel)
);

-- Outbox + in-app feed. A worker delivers rows per channel and stamps delivered_at.
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  event_type   text not null,
  task_id      uuid references public.tasks (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  delivered_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and is_active
  );
$$;

create function public.is_client_manager(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.client_members
    where client_id = cid and user_id = (select auth.uid()) and role = 'manager'
  );
$$;

create function public.is_project_member(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = (select auth.uid())
  );
$$;

create function public.can_view_client(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or exists (select 1 from public.client_members
               where client_id = cid and user_id = (select auth.uid()))
    or exists (select 1 from public.tasks t
               join public.task_assignees a on a.task_id = t.id
               where t.client_id = cid and a.user_id = (select auth.uid()));
$$;

create function public.can_view_project(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_project_member(pid)
    or exists (select 1 from public.projects p
               where p.id = pid and public.is_client_manager(p.client_id))
    or exists (select 1 from public.tasks t
               join public.task_assignees a on a.task_id = t.id
               where t.project_id = pid and a.user_id = (select auth.uid()));
$$;

create function public.is_task_assignee(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.task_assignees
    where task_id = tid and user_id = (select auth.uid())
  );
$$;

-- Row-level predicates take the row's columns (not a lookup by id), so they also
-- work for a row that is being inserted and returned in the same statement.
create function public.task_visible(tid uuid, creator uuid, cid uuid, pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or creator = (select auth.uid())
    or (cid is not null and public.is_client_manager(cid))
    or (pid is not null and public.is_project_member(pid))
    or public.is_task_assignee(tid);
$$;

create function public.task_editable(tid uuid, creator uuid, cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or creator = (select auth.uid())
    or (cid is not null and public.is_client_manager(cid))
    or public.is_task_assignee(tid);
$$;

-- By-id variants for child tables (assignees, comments), where the task already exists.
create function public.can_view_task(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.id = tid and public.task_visible(t.id, t.created_by, t.client_id, t.project_id)
  );
$$;

create function public.can_edit_task(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t
    where t.id = tid and public.task_editable(t.id, t.created_by, t.client_id)
  );
$$;

-- Who may file a task under a given client/project.
create function public.can_create_task_in(cid uuid, pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when cid is null and pid is null then true                       -- personal task
    when pid is not null then public.is_project_member(pid)
                              or public.is_client_manager(cid)
    else public.is_client_manager(cid)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_touch  before update on public.clients  for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- Keeps tasks consistent: client follows project, subtasks inherit from parent,
-- status bookkeeping, and created_by can't be spoofed.
create function public.tasks_before_write() returns trigger
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

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.status_changed_at := now();
    if new.status = 'done' then new.completed_at := now(); end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    if (new.client_id is distinct from old.client_id or new.project_id is distinct from old.project_id)
       and (select auth.uid()) is not null
       and not public.can_create_task_in(new.client_id, new.project_id) then
      raise exception 'Not allowed to move this task to that client or project';
    end if;
    if new.status is distinct from old.status then
      new.status_changed_at := now();
      new.completed_at := case when new.status = 'done' then now() else null end;
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- Only admins may change roles or deactivate people.
create function public.profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email)
     and not public.is_admin()
     and (select auth.uid()) is not null then
    raise exception 'Only an admin can change role, status or email';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- New auth user → profile. Name, initials, colors and role come from the invite metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  name text := coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, full_name, initials, avatar_bg, avatar_fg, role)
  values (
    new.id,
    new.email,
    name,
    coalesce(nullif(meta ->> 'initials', ''), upper(left(name, 1))),
    coalesce(nullif(meta ->> 'avatar_bg', ''), '#C3BFAE'),
    coalesce(nullif(meta ->> 'avatar_fg', ''), '#2F2D2E'),
    case when meta ->> 'role' = 'admin' then 'admin'::public.app_role else 'user'::public.app_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.clients                  enable row level security;
alter table public.client_members           enable row level security;
alter table public.projects                 enable row level security;
alter table public.project_members          enable row level security;
alter table public.tasks                    enable row level security;
alter table public.task_assignees           enable row level security;
alter table public.task_comments            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications            enable row level security;

-- profiles: the whole (small, internal) team is visible to every signed-in user.
create policy "profiles: read"   on public.profiles for select to authenticated using (true);
create policy "profiles: update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- clients
create policy "clients: read"   on public.clients for select to authenticated using (public.can_view_client(id));
create policy "clients: insert" on public.clients for insert to authenticated with check (public.is_admin());
create policy "clients: update" on public.clients for update to authenticated
  using (public.is_client_manager(id)) with check (public.is_client_manager(id));
create policy "clients: delete" on public.clients for delete to authenticated using (public.is_admin());

-- client_members: admins assign managers; managers see who is on their client.
create policy "client_members: read" on public.client_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_client_manager(client_id));
create policy "client_members: write" on public.client_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- projects
create policy "projects: read" on public.projects for select to authenticated
  using (public.is_client_manager(client_id) or public.can_view_project(id));
create policy "projects: write" on public.projects for all to authenticated
  using (public.is_client_manager(client_id)) with check (public.is_client_manager(client_id));

-- project_members: managers staff their client's projects; teammates see each other.
create policy "project_members: read" on public.project_members for select to authenticated
  using (public.can_view_project(project_id));
create policy "project_members: write" on public.project_members for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and public.is_client_manager(p.client_id)))
  with check (exists (select 1 from public.projects p where p.id = project_id and public.is_client_manager(p.client_id)));

-- tasks
create policy "tasks: read" on public.tasks for select to authenticated
  using (public.task_visible(id, created_by, client_id, project_id));
create policy "tasks: insert" on public.tasks for insert to authenticated
  with check (public.can_create_task_in(client_id, project_id));
-- Moving a task to another client/project is re-checked in tasks_before_write.
create policy "tasks: update" on public.tasks for update to authenticated
  using (public.task_editable(id, created_by, client_id))
  with check (true);
create policy "tasks: delete" on public.tasks for delete to authenticated
  using (public.is_admin()
         or created_by = (select auth.uid())
         or (client_id is not null and public.is_client_manager(client_id)));

-- task_assignees
create policy "task_assignees: read"  on public.task_assignees for select to authenticated using (public.can_view_task(task_id));
create policy "task_assignees: write" on public.task_assignees for all to authenticated
  using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id));

-- task_comments: anyone who can see the task can discuss it; authors edit their own.
create policy "task_comments: read"   on public.task_comments for select to authenticated using (public.can_view_task(task_id));
create policy "task_comments: insert" on public.task_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_view_task(task_id));
create policy "task_comments: update" on public.task_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "task_comments: delete" on public.task_comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- notification preferences and feed: strictly personal.
create policy "notification_preferences: own" on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: mark read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Data API grants (new tables are not exposed automatically in this project)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function public.handle_new_user() from authenticated;
