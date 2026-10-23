-- Monthly report for the client portal.
-- A video keeps the link of its post once it's out (Instagram, TikTok…), for the report's list of posts
-- and, later, for its numbers from the networks.
alter table public.tasks add column post_url text check (post_url is null or post_url ~* '^https?://');

-- A month's report is shown to the client only once the team publishes it (after checking it and
-- writing a word for them). Until then the portal doesn't show that month.
create table public.portal_reports (
  client_id     uuid not null references public.clients (id) on delete cascade,
  month         text not null check (month ~ '^\d{4}-\d{2}$'),
  summary       text,
  published_at  timestamptz,
  published_by  uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (client_id, month)
);

alter table public.portal_reports enable row level security;
-- The client's team reads it; whoever runs the client (its managers, the admin) writes and publishes it.
create policy "portal_reports: read" on public.portal_reports for select to authenticated using (public.can_view_client(client_id));
create policy "portal_reports: write" on public.portal_reports for all to authenticated
  using (public.is_admin() or public.is_client_manager(client_id))
  with check (public.is_admin() or public.is_client_manager(client_id));
grant select, insert, update, delete on public.portal_reports to authenticated, service_role;
