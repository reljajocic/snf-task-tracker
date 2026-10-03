-- Phase 3: client portal.
--
-- Clients open the portal through a secret link (no login). The portal pages run on the
-- server with the service role and only ever read/write rows for the client the token
-- belongs to; the team manages everything below through normal RLS.

create table public.client_portals (
  client_id   uuid primary key references public.clients (id) on delete cascade,
  enabled     boolean not null default false,
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- What the client sees. Internal tasks and notes are never shown.
  show_schedule boolean not null default true,
  show_shoots   boolean not null default true,
  show_scripts  boolean not null default true,
  show_review   boolean not null default true,
  show_report   boolean not null default true,
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz
);

-- People on the client's side (they don't log in; used for emails and as the approver list).
create table public.portal_people (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  label       text not null,                 -- "Marketing", "Owner", a name…
  email       text,
  can_approve boolean not null default true,
  created_at  timestamptz not null default now()
);
create index portal_people_client_idx on public.portal_people (client_id);

-- Video cuts the client reviews (links to Drive / Vimeo / YouTube).
create table public.video_versions (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  version     integer not null,
  url         text not null,
  note        text,                          -- what changed, shown to the client
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (task_id, version)
);

-- Client decisions. A script approval has no version; a video approval is per version.
create table public.approvals (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks (id) on delete cascade,
  kind          text not null check (kind in ('script', 'video')),
  version_id    uuid references public.video_versions (id) on delete cascade,
  status        text not null check (status in ('approved', 'changes')),
  comment       text,
  approver_name text not null,
  created_at    timestamptz not null default now()
);
create index approvals_task_idx on public.approvals (task_id, created_at desc);

create table public.portal_activity (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);
create index portal_activity_client_idx on public.portal_activity (client_id, created_at desc);

alter table public.client_portals  enable row level security;
alter table public.portal_people   enable row level security;
alter table public.video_versions  enable row level security;
alter table public.approvals       enable row level security;
alter table public.portal_activity enable row level security;

-- Portal settings and client contacts: managers of the client.
create policy "client_portals: read"  on public.client_portals for select to authenticated using (public.can_view_client(client_id));
create policy "client_portals: write" on public.client_portals for all to authenticated
  using (public.is_client_manager(client_id)) with check (public.is_client_manager(client_id));
create policy "portal_people: read"  on public.portal_people for select to authenticated using (public.can_view_client(client_id));
create policy "portal_people: write" on public.portal_people for all to authenticated
  using (public.is_client_manager(client_id)) with check (public.is_client_manager(client_id));
create policy "portal_activity: read" on public.portal_activity for select to authenticated using (public.can_view_client(client_id));

-- Versions follow the video: visible to whoever sees it, added by whoever edits it.
create policy "video_versions: read"  on public.video_versions for select to authenticated using (public.can_view_task(task_id));
create policy "video_versions: write" on public.video_versions for all to authenticated
  using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id));
create policy "approvals: read" on public.approvals for select to authenticated using (public.can_view_task(task_id));

grant select, insert, update, delete on public.client_portals, public.portal_people, public.video_versions to authenticated, service_role;
grant select on public.approvals, public.portal_activity to authenticated;
grant select, insert, update, delete on public.approvals, public.portal_activity to service_role;
