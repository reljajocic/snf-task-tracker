-- Instagram, connected per client (the team logs in as the client's professional account once).
-- The access token lives in its own table that only the server (service role) can read; the team sees
-- just which account is connected. Numbers are pulled by the server each morning (and on request).

create table public.instagram_accounts (
  client_id     uuid primary key references public.clients (id) on delete cascade,
  ig_user_id    text not null,
  username      text,
  connected_by  uuid references public.profiles (id) on delete set null,
  connected_at  timestamptz not null default now(),
  synced_at     timestamptz,
  sync_error    text
);

create table public.instagram_tokens (
  client_id     uuid primary key references public.instagram_accounts (client_id) on delete cascade,
  access_token  text not null,
  expires_at    timestamptz
);

-- A post's numbers, as Instagram last reported them.
create table public.post_metrics (
  task_id     uuid primary key references public.tasks (id) on delete cascade,
  media_id    text not null,
  views       integer,
  reach       integer,
  likes       integer,
  comments    integer,
  saved       integer,
  shares      integer,
  fetched_at  timestamptz not null default now()
);

-- Followers, one reading a day (the report compares the month's first and last).
create table public.instagram_followers (
  client_id  uuid not null references public.clients (id) on delete cascade,
  day        date not null,
  followers  integer not null,
  primary key (client_id, day)
);

alter table public.instagram_accounts  enable row level security;
alter table public.instagram_tokens    enable row level security;
alter table public.post_metrics        enable row level security;
alter table public.instagram_followers enable row level security;

create policy "instagram_accounts: read" on public.instagram_accounts for select to authenticated using (public.can_view_client(client_id));
create policy "post_metrics: read" on public.post_metrics for select to authenticated using (public.can_view_task(task_id));
create policy "instagram_followers: read" on public.instagram_followers for select to authenticated using (public.can_view_client(client_id));

-- The team only reads; connecting, syncing and disconnecting go through the server. Tokens: server only.
grant select on public.instagram_accounts, public.post_metrics, public.instagram_followers to authenticated;
grant select, insert, update, delete on public.instagram_accounts, public.instagram_tokens, public.post_metrics, public.instagram_followers to service_role;
