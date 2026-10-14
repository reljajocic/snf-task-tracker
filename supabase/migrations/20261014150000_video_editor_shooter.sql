-- Videos get two roles instead of a loose list of people: one editor (the edit work, and the only
-- one who gets the video in their tasks) and, optionally, who films it (empty = the shoot day's crew).
alter table public.tasks
  add column editor_id  uuid references public.profiles (id) on delete set null,
  add column shooter_id uuid references public.profiles (id) on delete set null;
create index tasks_editor_idx on public.tasks (editor_id) where editor_id is not null;

-- The editor and the shooter work on the video like anyone assigned to it.
create or replace function public.is_task_assignee(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.task_assignees
    where task_id = tid and user_id = (select auth.uid())
  ) or exists (
    select 1 from public.tasks
    where id = tid and (editor_id = (select auth.uid()) or shooter_id = (select auth.uid()))
  );
$$;
