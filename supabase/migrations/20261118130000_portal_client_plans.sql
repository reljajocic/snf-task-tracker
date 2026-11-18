-- The client plans posting dates in the portal: sees filmed videos that have no date yet, gives them one,
-- and moves dates of posts not published yet. Off until a manager turns it on for the client.
-- The portal writes with the service role after checking the secret link; nothing changes for signed-in users.
alter table public.client_portals add column client_plans boolean not null default false;
