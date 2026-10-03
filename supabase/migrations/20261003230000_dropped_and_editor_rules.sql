-- Dropped videos and per-client editor rules.
--
-- A dropped video (the sheet's SCRAPED, or an idea that was never shot) is closed without
-- being published: status = done, phase unchanged, published_at null. Reopening clears it.
--
-- clients.editor_rules picks who edits a scheduled video:
--   [{ "editor_id": uuid, "days": [0..6], "types": ["INFO", …] }, …]
-- A rule matching the posting weekday wins over one matching only the content type;
-- default_editor_id is the fallback.

alter table public.tasks add column dropped_at date;
alter table public.clients add column editor_rules jsonb not null default '[]';

create or replace function public.tasks_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null then
    select client_id, project_id into new.client_id, new.project_id
    from public.tasks where id = new.parent_id;
    new.kind := 'subtask';
  end if;

  if new.project_id is not null then
    select client_id into new.client_id from public.projects where id = new.project_id;
  end if;

  if new.kind = 'video' then
    new.phase := coalesce(new.phase, 0);
    new.shot_status := coalesce(new.shot_status, 'to_shoot');
    if tg_op = 'UPDATE' and old.dropped_at is not null and new.dropped_at is not null
       and new.status is distinct from old.status and new.status <> 'done' then
      new.dropped_at := null;  -- reopened from the board
    end if;
  end if;

  if new.kind = 'video' and new.dropped_at is not null then
    new.status := 'done';
    new.published_at := null;
  elsif new.kind = 'video' then
    if tg_op = 'INSERT' or new.phase is distinct from old.phase then
      -- Phase drives status: revision waits on the client, published is done.
      if new.phase = 3 then
        new.status := 'waiting_client';
      elsif new.phase = 5 then
        new.status := 'done';
        new.published_at := coalesce(new.published_at, (now() at time zone 'Europe/Belgrade')::date);
      elsif tg_op = 'UPDATE' and new.status in ('waiting_client', 'done') then
        new.status := 'in_progress';
      end if;
    elsif new.status is distinct from old.status and new.status = 'done' and new.phase < 5 then
      -- Closing a video from the board means it's out.
      new.phase := 5;
      new.published_at := coalesce(new.published_at, (now() at time zone 'Europe/Belgrade')::date);
    end if;
    if new.phase < 5 then
      new.published_at := null;
    end if;
    -- Being put on a shoot day means the script is done.
    if new.shoot_id is not null and new.phase = 0 then
      new.phase := 1;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.status_changed_at := now();
    if new.status = 'done' then new.completed_at := now(); end if;
  else
    if (new.client_id is distinct from old.client_id or new.project_id is distinct from old.project_id)
       and (select auth.uid()) is not null
       and not public.can_create_task_in(new.client_id, new.project_id) then
      raise exception 'Not allowed to move this task to that client or project';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    if new.status is distinct from old.status then
      new.status_changed_at := now();
      new.completed_at := case when new.status = 'done' then now() else null end;
    end if;
  end if;
  return new;
end;
$$;

