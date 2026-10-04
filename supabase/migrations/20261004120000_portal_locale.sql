-- The client portal's language, per client (most clients are Serbian).
alter table public.client_portals
  add column locale text not null default 'sr' check (locale in ('en', 'sr'));
