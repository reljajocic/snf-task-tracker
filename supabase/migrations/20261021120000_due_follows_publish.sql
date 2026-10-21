-- A video's deadline moves with its posting date: move the post two days and the edit is due two days later
-- too (the gap stays what it was). Wherever the date changes: the app, the schedule, the MCP. Not when the
-- same change sets the deadline itself, nor when the date is cleared.
create function public.tasks_due_follows_publish() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.publish_date is distinct from old.publish_date
     and old.publish_date is not null and new.publish_date is not null
     and old.due_date is not null and new.due_date is not distinct from old.due_date then
    new.due_date := old.due_date + (new.publish_date - old.publish_date);
  end if;
  return new;
end;
$$;

create trigger tasks_due_follows_publish before update of publish_date on public.tasks
  for each row execute function public.tasks_due_follows_publish();
