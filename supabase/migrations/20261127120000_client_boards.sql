-- Moodboards for clients too: besides one board per project, each client has one general board
-- (brand, style, references). A board belongs to exactly one of the two. The client's team works on
-- the client's board; the project's board keeps its rule (client's team or project members).
alter table public.boards alter column project_id drop not null;
alter table public.boards add column client_id uuid unique references public.clients (id) on delete cascade;
alter table public.boards add constraint boards_one_owner check (num_nonnulls(project_id, client_id) = 1);

create function public.can_use_board_of(pid uuid, cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when pid is not null then public.can_use_project_board(pid)
    when cid is not null then public.is_client_team(cid)
    else false
  end;
$$;
grant execute on function public.can_use_board_of(uuid, uuid) to authenticated, service_role;

create or replace function public.can_use_board(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.boards b where b.id = bid and public.can_use_board_of(b.project_id, b.client_id));
$$;

drop policy "boards: read" on public.boards;
drop policy "boards: create" on public.boards;
drop policy "boards: update" on public.boards;
create policy "boards: read" on public.boards for select to authenticated using (public.can_use_board_of(project_id, client_id));
create policy "boards: create" on public.boards for insert to authenticated with check (public.can_use_board_of(project_id, client_id));
create policy "boards: update" on public.boards for update to authenticated
  using (public.can_use_board_of(project_id, client_id)) with check (public.can_use_board_of(project_id, client_id));
