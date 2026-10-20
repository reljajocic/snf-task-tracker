-- People see only the people they work with: someone on a client, project, task or shoot day they can see
-- (or who commented on such a task). The admin and partners still see everyone (they run the team and the money).
-- Someone given the app for their own clients sees themselves and whoever they work with, nobody else's team.
create function public.can_see_person(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select pid = (select auth.uid())
    or public.is_admin()
    or public.is_partner()
    or exists (select 1 from public.client_members m where m.user_id = pid and public.can_view_client(m.client_id))
    or exists (select 1 from public.project_members m where m.user_id = pid and public.can_view_project(m.project_id))
    or exists (select 1 from public.task_assignees a where a.user_id = pid and public.can_view_task(a.task_id))
    or exists (select 1 from public.tasks t where pid in (t.editor_id, t.shooter_id, t.created_by) and public.can_view_task(t.id))
    or exists (select 1 from public.shoot_crew c join public.shoot_days s on s.id = c.shoot_id
               where c.user_id = pid and (public.can_view_client(s.client_id) or public.is_shoot_crew(s.id)))
    or exists (select 1 from public.task_comments k where k.author_id = pid and public.can_view_task(k.task_id));
$$;
grant execute on function public.can_see_person(uuid) to authenticated, service_role;

drop policy "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated using (public.can_see_person(id));
