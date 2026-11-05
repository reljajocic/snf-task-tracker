-- Reminders on a client ("send the invoice on the 1st"), once or every month.
-- They're personal: each person sees and manages only their own, and only on clients they can see.
-- The morning job (/api/cron/reminders, service role) sends them as push/email on the day,
-- then moves a monthly one to the next month and marks a one-off as done.
create table public.client_reminders (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 200),
  remind_on   date not null,
  repeat      text not null default 'none' check (repeat in ('none', 'monthly')),
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index client_reminders_due_idx on public.client_reminders (remind_on) where done_at is null;
create index client_reminders_client_idx on public.client_reminders (client_id, user_id);
alter table public.client_reminders enable row level security;

create policy "client_reminders: own, on visible clients" on public.client_reminders for all to authenticated
  using (user_id = (select auth.uid()) and public.can_view_client(client_id))
  with check (user_id = (select auth.uid()) and public.can_view_client(client_id));

grant select, insert, update, delete on public.client_reminders to authenticated;
grant select, update on public.client_reminders to service_role;
