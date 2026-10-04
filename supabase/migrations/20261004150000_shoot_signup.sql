-- Talent sign-up link per shoot day: anyone with /s/<token> sees that shoot's videos and scripts
-- and writes their name next to the ones they'll film (it goes into tasks.on_camera). No login;
-- the app reads and writes for them with the service role, scoped to the token's shoot.
-- null = the link is off.
alter table public.shoot_days add column signup_token text unique check (signup_token is null or signup_token ~ '^[0-9a-f]{32}$');
