-- Faster reads, same rules. The read policies called a helper per row (task_visible, can_view_task,
-- can_see_person, can_view_client), each running its own lookups, and Postgres checks a policy on every row
-- it scans: with ~1000 tasks in the bank, a list of 60 cost ~5000 lookups (~0.6 s) before any filter.
-- These set versions run once per query; the policies only check membership in them. (Clients stay
-- per row: there are only a few.)

-- The lookups behind task_visible(), each once per query. A policy checks the row's own columns itself
-- (creator, editor, shooter, client, project, shoot), so a row being inserted passes its RETURNING check.
create function public.my_team_client_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.client_id from public.client_members m where m.user_id = (select auth.uid());
$$;
create function public.my_project_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.project_id from public.project_members m where m.user_id = (select auth.uid());
$$;
create function public.my_assigned_task_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select a.task_id from public.task_assignees a where a.user_id = (select auth.uid());
$$;
create function public.my_crew_shoot_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select c.shoot_id from public.shoot_crew c where c.user_id = (select auth.uid());
$$;

-- Tasks the signed-in user may see: task_visible() or crew on the task's shoot (as "tasks: read").
create function public.my_task_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.tasks t
  where (select public.is_admin())
     or t.created_by = (select auth.uid())
     or t.editor_id = (select auth.uid())
     or t.shooter_id = (select auth.uid())
     or t.client_id in (select public.my_team_client_ids())
     or t.project_id in (select public.my_project_ids())
     or t.id in (select public.my_assigned_task_ids())
     or t.shoot_id in (select public.my_crew_shoot_ids());
$$;

-- Clients the signed-in user may see (can_view_client; a handful of rows).
create function public.my_client_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.clients c where public.can_view_client(c.id);
$$;

-- Shoot days the signed-in user may see (as "shoot_days: read").
create function public.my_shoot_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.shoot_days s
  where s.client_id in (select public.my_client_ids()) or s.id in (select public.my_crew_shoot_ids());
$$;

-- People the signed-in user may see (can_see_person, set at a time).
create function public.my_person_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p
  where p.id = (select auth.uid()) or (select public.is_admin()) or (select public.is_partner())
  union
  select m.user_id from public.client_members m where m.client_id in (select public.my_client_ids())
  union
  select m.user_id from public.project_members m where public.can_view_project(m.project_id)
  union
  select a.user_id from public.task_assignees a where a.task_id in (select public.my_task_ids())
  union
  select x.id from public.tasks t
    cross join lateral unnest(array[t.editor_id, t.shooter_id, t.created_by]) as x(id)
    where x.id is not null and t.id in (select public.my_task_ids())
  union
  select c.user_id from public.shoot_crew c where c.shoot_id in (select public.my_shoot_ids())
  union
  select k.author_id from public.task_comments k where k.task_id in (select public.my_task_ids());
$$;

grant execute on function public.my_team_client_ids(), public.my_project_ids(), public.my_assigned_task_ids(),
  public.my_crew_shoot_ids(), public.my_task_ids(), public.my_client_ids(), public.my_shoot_ids(), public.my_person_ids()
  to authenticated, service_role;

drop policy "tasks: read" on public.tasks;
create policy "tasks: read" on public.tasks for select to authenticated
  using ((select public.is_admin())
         or created_by = (select auth.uid())
         or editor_id = (select auth.uid())
         or shooter_id = (select auth.uid())
         or client_id in (select public.my_team_client_ids())
         or project_id in (select public.my_project_ids())
         or id in (select public.my_assigned_task_ids())
         or shoot_id in (select public.my_crew_shoot_ids()));

drop policy "task_assignees: read" on public.task_assignees;
create policy "task_assignees: read" on public.task_assignees for select to authenticated
  using (task_id in (select public.my_task_ids()));

drop policy "task_comments: read" on public.task_comments;
create policy "task_comments: read" on public.task_comments for select to authenticated
  using (task_id in (select public.my_task_ids()));

drop policy "approvals: read" on public.approvals;
create policy "approvals: read" on public.approvals for select to authenticated
  using (task_id in (select public.my_task_ids()));

drop policy "video_versions: read" on public.video_versions;
create policy "video_versions: read" on public.video_versions for select to authenticated
  using (task_id in (select public.my_task_ids()));

drop policy "video_shoot_history: read" on public.video_shoot_history;
create policy "video_shoot_history: read" on public.video_shoot_history for select to authenticated
  using (task_id in (select public.my_task_ids()));

drop policy "post_metrics: read" on public.post_metrics;
create policy "post_metrics: read" on public.post_metrics for select to authenticated
  using (task_id in (select public.my_task_ids()));

drop policy "shoot_days: read" on public.shoot_days;
create policy "shoot_days: read" on public.shoot_days for select to authenticated
  using (client_id in (select public.my_client_ids()) or id in (select public.my_crew_shoot_ids()));

drop policy "shoot_crew: read" on public.shoot_crew;
create policy "shoot_crew: read" on public.shoot_crew for select to authenticated
  using (shoot_id in (select public.my_shoot_ids()));

drop policy "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated
  using (id in (select public.my_person_ids()));
