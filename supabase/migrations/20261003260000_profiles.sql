-- Clients that post to several profiles (Moto Milano: Kymco Srbija and QJ Srbija on Instagram)
-- keep a schedule per profile. clients.profiles lists them; tasks.profile says where a post goes.
alter table public.clients add column profiles text[] not null default '{}';
alter table public.tasks add column profile text;
