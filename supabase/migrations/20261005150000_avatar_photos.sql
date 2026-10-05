-- Profile photos. Files live in a public Storage bucket "avatars" (uploaded by the app's server
-- after checking it's your own profile or you're the admin); the profile keeps the URL.
alter table public.profiles add column avatar_url text;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
    on conflict (id) do nothing;
  end if;
end $$;
