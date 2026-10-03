-- A client can have several social profiles on different networks
-- (e.g. two Instagram accounts and a TikTok). Replaces the single instagram column.
alter table public.clients add column socials jsonb not null default '[]';

update public.clients
   set socials = jsonb_build_array(jsonb_build_object('platform', 'instagram', 'handle', instagram))
 where coalesce(trim(instagram), '') <> '';

alter table public.clients drop column instagram;
