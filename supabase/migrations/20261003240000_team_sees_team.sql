-- Everyone on a client's team sees who else is on it (to assign work to them),
-- not just managers. Writes stay admin-only.
drop policy "client_members: read" on public.client_members;
create policy "client_members: read" on public.client_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_client_team(client_id));
