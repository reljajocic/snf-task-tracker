-- Call times for a shoot day: who comes when (like the NoLimit call sheet).
-- [{ "time": "20:00", "name": "Marko Rosandić", "note": "…" }, …]
alter table public.shoot_days add column call_times jsonb not null default '[]';

-- Content-type tags are each client's own; new clients start with none.
alter table public.clients alter column content_types set default '{}';
