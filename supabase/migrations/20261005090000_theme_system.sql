-- Theme can follow the device ("system"), and that's the default.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check check (theme in ('dark', 'light', 'system'));
alter table public.profiles alter column theme set default 'system';
