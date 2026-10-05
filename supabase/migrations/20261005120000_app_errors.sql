-- Errors people run into (server and browser), so the admin hears about them without being told.
-- Written by the app with the service role only; the admin can read them.
create table public.app_errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  source      text not null check (source in ('server', 'browser')),
  message     text not null,
  digest      text,
  path        text,
  route       text,
  user_id     uuid references public.profiles (id) on delete set null
);
create index app_errors_recent_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
create policy "app_errors: admin reads" on public.app_errors for select to authenticated using (public.is_admin());

-- New tables aren't exposed to the Data API automatically in this project.
grant select on public.app_errors to authenticated;
grant select, insert, delete on public.app_errors to service_role;
