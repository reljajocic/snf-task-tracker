-- Phones and browsers that asked for push notifications (Web Push). One row per device; a device belongs
-- to whoever turned notifications on there last, so a shared phone never gets the previous person's.
create table public.push_subscriptions (
  endpoint    text primary key check (endpoint like 'https://%'),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: own read" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subscriptions: own delete" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.push_subscriptions to authenticated;
-- The sender reads recipients' devices and forgets the ones the push service says are gone.
grant select, delete on public.push_subscriptions to service_role;

-- Turning notifications on: this device now notifies the caller (taking it over from anyone who had it).
-- Only the device knows its endpoint, so this can't be used to take someone else's notifications.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void language sql security definer set search_path = '' as $$
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
$$;
revoke execute on function public.save_push_subscription(text, text, text) from public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
