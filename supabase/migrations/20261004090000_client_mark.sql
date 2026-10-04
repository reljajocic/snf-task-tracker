-- A client's own mark in lists: a colour (#rrggbb) and initials (up to 3), both optional.
alter table public.clients
  add column color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  add column initials text check (initials is null or char_length(initials) between 1 and 3);
