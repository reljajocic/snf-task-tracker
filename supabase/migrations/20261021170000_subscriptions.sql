-- Subscriptions: a cost that comes back every month (a tool, the accountant, hosting). Each month, on its day,
-- it becomes an ordinary cost, so earnings and the costs list count it like any other. Partners only, as costs.
create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  amount        numeric(14, 2) not null check (amount > 0),
  supplier      text,
  client_id     uuid references public.clients (id) on delete set null,
  profile_id    uuid references public.profiles (id) on delete set null, -- null = split between partners
  day_of_month  smallint not null default 1 check (day_of_month between 1 and 31),
  starts_on     date not null default current_date,
  ends_on       date,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

alter table public.expenses add column subscription_id uuid references public.subscriptions (id) on delete set null;
-- One cost per subscription per billing day (so posting twice never doubles it).
create unique index expenses_subscription_day on public.expenses (subscription_id, spent_on) where subscription_id is not null;

alter table public.subscriptions enable row level security;
create policy "subscriptions: partners" on public.subscriptions for all to authenticated
  using (public.can_see_finance()) with check (public.can_see_finance());
grant select, insert, update, delete on public.subscriptions to authenticated, service_role;

-- Turns subscriptions into costs for every billing day from their start up to `upto` (a day past the month's
-- end lands on its last day: the 31st in February is the 28th/29th). Safe to run any number of times.
-- The daily cron runs it as the service role; a partner's save runs it too, so a new one shows at once.
create function public.post_subscriptions(upto date default current_date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if (select auth.uid()) is not null and not public.can_see_finance() then
    raise exception 'Only a partner can post subscriptions';
  end if;
  insert into public.expenses (spent_on, description, amount, supplier, client_id, profile_id, subscription_id, created_by)
  select d.billing, s.name, s.amount, s.supplier, s.client_id, s.profile_id, s.id, s.created_by
  from public.subscriptions s
  cross join lateral (
    select (m + make_interval(days => least(s.day_of_month, extract(day from (m + interval '1 month - 1 day'))::int) - 1))::date as billing
    from generate_series(date_trunc('month', s.starts_on), date_trunc('month', upto), interval '1 month') m
  ) d
  where d.billing >= s.starts_on and d.billing <= upto and (s.ends_on is null or d.billing <= s.ends_on)
  on conflict (subscription_id, spent_on) where subscription_id is not null do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.post_subscriptions(date) to authenticated, service_role;
