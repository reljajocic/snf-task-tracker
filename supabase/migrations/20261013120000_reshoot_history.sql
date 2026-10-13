-- Reshoots: a filmed (or scheduled) video whose footage can't be used goes back to Ideas,
-- and the attempt is kept. One row per attempt, copied at the moment it's sent back, so the
-- record survives the shoot day being edited or deleted. Append-only through the API.
create table public.video_shoot_history (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references public.tasks (id) on delete cascade,
  shoot_id          uuid references public.shoot_days (id) on delete set null,
  shoot_date        date,
  location          text,
  shoot_time        text,
  on_camera         text,
  shot_status       text,
  publish_date      date,
  reason            text not null check (length(btrim(reason)) between 1 and 500),
  returned_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  returned_at       timestamptz not null default now()
);
create index video_shoot_history_task_idx on public.video_shoot_history (task_id, returned_at desc);
alter table public.video_shoot_history enable row level security;
create policy "video_shoot_history: read" on public.video_shoot_history for select to authenticated
  using (public.can_view_task(task_id));
create policy "video_shoot_history: add" on public.video_shoot_history for insert to authenticated
  with check (public.can_edit_task(task_id));

grant select, insert on public.video_shoot_history to authenticated;
grant select, insert on public.video_shoot_history to service_role;

-- "Return to ideas": record the attempt and reset the video in one step. Runs as the caller
-- (security invoker), so both writes go through RLS: only people who can edit the video can.
-- Keeps the script, its approval, earlier cuts and the people on the video.
create function public.return_to_ideas(tid uuid, why text) returns uuid
language plpgsql set search_path = '' as $$
declare
  t public.tasks;
  d public.shoot_days;
  hid uuid;
begin
  if why is null or btrim(why) = '' then raise exception 'A reason is required'; end if;
  select * into t from public.tasks where id = tid and kind = 'video';
  if not found then raise exception 'Video not found'; end if;
  if t.dropped_at is not null then raise exception 'Video is dropped'; end if;
  if coalesce(t.phase, 0) >= 5 then raise exception 'Video is already published'; end if;
  if t.shoot_id is null and t.publish_date is null and coalesce(t.phase, 0) < 2 and t.shot_status is distinct from 'shot' then
    raise exception 'Video is already an idea';
  end if;
  if t.shoot_id is not null then
    select * into d from public.shoot_days where id = t.shoot_id;
  end if;

  insert into public.video_shoot_history
    (task_id, shoot_id, shoot_date, location, shoot_time, on_camera, shot_status, publish_date, reason)
  values
    (tid, t.shoot_id, d.date, coalesce(d.location, t.location), t.shoot_time, t.on_camera, t.shot_status, t.publish_date, btrim(why))
  returning id into hid;

  update public.tasks
     set phase = 0, status = 'todo', shot_status = 'to_shoot',
         shoot_id = null, shoot_time = null, shoot_order = null,
         publish_date = null, due_date = null
   where id = tid;
  if not found then raise exception 'Not allowed'; end if;
  return hid;
end;
$$;
grant execute on function public.return_to_ideas(uuid, text) to authenticated;

-- "6 razloga" (NoLimit Gym) was sent back by hand on 13.10 before this existed; record that attempt.
insert into public.video_shoot_history (task_id, shoot_id, shoot_date, location, on_camera, shot_status, reason, returned_by, returned_at)
select t.id,
       (select s.id from public.shoot_days s where s.client_id = t.client_id and s.date = '2026-09-23' limit 1),
       '2026-09-23', 'Novo Naselje', 'Petar Zeljković', 'shot',
       'Loša izvedba sagovornika, snimiti ponovo sa drugim sagovornikom.', null, '2026-10-13 09:12:34+00'
  from public.tasks t
 where t.id = 'a0d6876e-e31a-42d5-8f10-6626bcbe27f3';
update public.tasks set due_date = null
 where id = 'a0d6876e-e31a-42d5-8f10-6626bcbe27f3' and due_date = '2026-10-13' and shoot_id is null and publish_date is null;
