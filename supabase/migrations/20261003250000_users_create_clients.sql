-- Anyone on the agency team can open a client and becomes its manager; a client's managers
-- run its team (add, remove, change roles). Deleting a client stays admin-only.

drop policy "clients: insert" on public.clients;
create policy "clients: insert" on public.clients for insert to authenticated
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_active));

create function public.clients_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    insert into public.client_members (client_id, user_id, role)
    values (new.id, (select auth.uid()), 'manager')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger clients_after_insert after insert on public.clients
  for each row execute function public.clients_after_insert();

drop policy "client_members: write" on public.client_members;
create policy "client_members: write" on public.client_members for all to authenticated
  using (public.is_admin() or public.is_client_manager(client_id))
  with check (public.is_admin() or public.is_client_manager(client_id));
