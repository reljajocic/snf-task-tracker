-- A client's managers may delete it (the app asks them to type its name first).
drop policy "clients: delete" on public.clients;
create policy "clients: delete" on public.clients for delete to authenticated using (public.is_client_manager(id));
