-- Being on a project is enough to see its client (name, contact, drive link).
-- Managers staff projects without needing admin-only writes to client_members.
create or replace function public.can_view_client(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or exists (select 1 from public.client_members
               where client_id = cid and user_id = (select auth.uid()))
    or exists (select 1 from public.project_members pm
               join public.projects p on p.id = pm.project_id
               where p.client_id = cid and pm.user_id = (select auth.uid()))
    or exists (select 1 from public.tasks t
               join public.task_assignees a on a.task_id = t.id
               where t.client_id = cid and a.user_id = (select auth.uid()));
$$;
