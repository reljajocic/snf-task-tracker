-- Invoices, the costs we pay and what each partner earns per month.
--
-- Access model
--   * Partners (profiles.is_partner, set by an admin) and admins see and edit all of it:
--     invoices, the split between partners, expenses and the monthly earnings.
--   * A client manager sees and edits that client's invoices only when they were picked for it
--     (client_members.sees_invoices, set by a partner or admin). They never see the split or costs.
--   * Everyone else sees nothing.
--   * Issued invoices keep their number for good: they can be cancelled, never deleted.

-- ---------------------------------------------------------------------------
-- Who
-- ---------------------------------------------------------------------------
alter table public.profiles add column is_partner boolean not null default false;
alter table public.client_members add column sees_invoices boolean not null default false;

create function public.is_partner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_partner and is_active
  );
$$;

create function public.can_see_finance() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.is_partner();
$$;

create function public.can_see_client_invoices(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_see_finance() or exists (
    select 1 from public.client_members
    where client_id = cid and user_id = (select auth.uid()) and role = 'manager' and sees_invoices
  );
$$;

-- Only an admin makes someone a partner (same rule as role and access).
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email or new.is_partner is distinct from old.is_partner)
     and not public.is_admin()
     and (select auth.uid()) is not null then
    raise exception 'Only an admin can change role, status, partner or email';
  end if;
  return new;
end;
$$;

-- Managers staff their client, but only a partner or admin decides who sees its invoices.
create function public.client_members_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.sees_invoices
     and (tg_op = 'INSERT' or not old.sees_invoices)
     and not public.can_see_finance()
     and (select auth.uid()) is not null then
    raise exception 'Only a partner can let someone see invoices';
  end if;
  return new;
end;
$$;

create trigger client_members_guard before insert or update on public.client_members
  for each row execute function public.client_members_guard();

-- Partners pick who sees a client's invoices (they may not be on the client's team themselves).
create function public.set_sees_invoices(cid uuid, uid uuid, sees boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_see_finance() then
    raise exception 'Only a partner can let someone see invoices';
  end if;
  update public.client_members set sees_invoices = sees where client_id = cid and user_id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
-- Who issues the invoice (a partner's PR firm), exactly as it is printed.
create table public.invoice_issuers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  address     text not null default '',
  pib         text not null default '',
  mb          text not null default '',
  account     text not null default '',
  place       text not null default 'Novi Sad',
  footer      text not null default '*Izdavalac računa nije obveznik pdv-a po članu 33. Zakona o pdv',
  owner_id    uuid references public.profiles (id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Who pays: the legal entity on the invoice. Optionally the app's client it belongs to
-- (that is what lets the client's picked managers see it).
create table public.invoice_buyers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  address     text not null default '',
  pib         text not null default '',
  mb          text not null default '',
  client_id   uuid references public.clients (id) on delete set null,
  created_at  timestamptz not null default now()
);

create type public.invoice_status as enum ('draft', 'issued', 'cancelled');

create table public.invoices (
  id          uuid primary key default gen_random_uuid(),
  issuer_id   uuid not null references public.invoice_issuers (id),
  year        integer,                       -- number = year/seq, e.g. 2026/031; set on issue
  seq         integer,
  buyer_id    uuid not null references public.invoice_buyers (id),
  client_id   uuid references public.clients (id) on delete set null,   -- copied from the buyer
  status      public.invoice_status not null default 'draft',
  issued_on   date not null default current_date,                       -- datum prometa
  due_days    integer not null default 7 check (due_days >= 0),
  currency    text not null default 'RSD' check (currency in ('RSD', 'EUR')),
  eur_rate    numeric(10, 4) check (eur_rate is null or eur_rate > 0),  -- NBS middle rate on issued_on
  items       jsonb not null default '[]',   -- [{description, quantity, price}] in `currency`
  total_rsd   numeric(14, 2) not null default 0,
  note        text,
  paid_on     date,
  pdf_url     text,
  -- Who issued it and who it was for, as printed when it was issued (later edits to the
  -- buyer or issuer don't rewrite old invoices).
  issuer_snapshot jsonb,
  buyer_snapshot  jsonb,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (issuer_id, year, seq),
  check ((year is null) = (seq is null)),
  check (currency = 'RSD' or eur_rate is not null)
);

create index invoices_client_idx on public.invoices (client_id);
create index invoices_issued_idx on public.invoices (issued_on desc);

-- How an invoice's money is split between partners (RSD). Missing rows = nobody's.
create table public.invoice_shares (
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  amount      numeric(14, 2) not null check (amount >= 0),
  primary key (invoice_id, profile_id)
);

-- What the business pays. No profile = split evenly between the partners.
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  spent_on    date not null default current_date,
  description text not null check (length(trim(description)) > 0),
  amount      numeric(14, 2) not null check (amount >= 0),
  supplier    text,
  client_id   uuid references public.clients (id) on delete set null,
  profile_id  uuid references public.profiles (id) on delete set null,
  doc_url     text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index expenses_spent_idx on public.expenses (spent_on desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
-- Keeps the client from the buyer, the total from the items, and hands out the next number
-- (per issuer and year) when an invoice is issued. A number never changes once given.
create function public.invoices_before_write() returns trigger
language plpgsql set search_path = '' as $$
declare
  subtotal numeric;
begin
  select b.client_id into new.client_id from public.invoice_buyers b where b.id = new.buyer_id;

  select coalesce(sum(coalesce((i ->> 'quantity')::numeric, 0) * coalesce((i ->> 'price')::numeric, 0)), 0)
    into subtotal
    from jsonb_array_elements(case when jsonb_typeof(new.items) = 'array' then new.items else '[]'::jsonb end) i;
  new.total_rsd := round(case when new.currency = 'EUR' then subtotal * new.eur_rate else subtotal end, 2);

  if tg_op = 'UPDATE' and old.seq is not null
     and (new.seq is distinct from old.seq or new.year is distinct from old.year or new.issuer_id is distinct from old.issuer_id) then
    raise exception 'An issued invoice keeps its number';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'draft' and new.status = 'draft' then
    raise exception 'An issued invoice can''t go back to a draft';
  end if;

  if new.status <> 'draft' and new.seq is null then
    perform pg_advisory_xact_lock(hashtext('invoice-number:' || new.issuer_id::text));
    new.year := extract(year from new.issued_on)::integer;
    select coalesce(max(seq), 0) + 1 into new.seq
      from public.invoices where issuer_id = new.issuer_id and year = new.year;
  end if;
  if new.status <> 'draft' and new.buyer_snapshot is null then
    select jsonb_build_object('name', b.name, 'address', b.address, 'pib', b.pib, 'mb', b.mb)
      into new.buyer_snapshot from public.invoice_buyers b where b.id = new.buyer_id;
  end if;
  if new.status <> 'draft' and new.issuer_snapshot is null then
    select jsonb_build_object('name', i.name, 'address', i.address, 'pib', i.pib, 'mb', i.mb,
                              'account', i.account, 'place', i.place, 'footer', i.footer)
      into new.issuer_snapshot from public.invoice_issuers i where i.id = new.issuer_id;
  end if;

  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

create trigger invoices_before_write before insert or update on public.invoices
  for each row execute function public.invoices_before_write();

-- A buyer moved to another client takes its invoices along (so the right managers see them).
create function public.invoice_buyers_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.client_id is distinct from old.client_id then
    update public.invoices set client_id = new.client_id where buyer_id = new.id;
  end if;
  return null;
end;
$$;

create trigger invoice_buyers_after_update after update on public.invoice_buyers
  for each row execute function public.invoice_buyers_after_update();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.invoice_issuers enable row level security;
alter table public.invoice_buyers  enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_shares  enable row level security;
alter table public.expenses        enable row level security;

-- Issuer details are printed on every invoice, so whoever handles invoices reads them.
create policy "invoice_issuers: read" on public.invoice_issuers for select to authenticated
  using (public.can_see_finance() or exists (
    select 1 from public.client_members
    where user_id = (select auth.uid()) and role = 'manager' and sees_invoices));
create policy "invoice_issuers: write" on public.invoice_issuers for all to authenticated
  using (public.can_see_finance()) with check (public.can_see_finance());

create policy "invoice_buyers: read" on public.invoice_buyers for select to authenticated
  using (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)));
create policy "invoice_buyers: insert" on public.invoice_buyers for insert to authenticated
  with check (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)));
create policy "invoice_buyers: update" on public.invoice_buyers for update to authenticated
  using (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)))
  with check (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)));
create policy "invoice_buyers: delete" on public.invoice_buyers for delete to authenticated
  using (public.can_see_finance());

create policy "invoices: read" on public.invoices for select to authenticated
  using (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)));
create policy "invoices: insert" on public.invoices for insert to authenticated
  with check (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)));
create policy "invoices: update" on public.invoices for update to authenticated
  using (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)))
  with check (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id)));
-- Only drafts go away; an issued number stays on record (cancel it instead).
create policy "invoices: delete" on public.invoices for delete to authenticated
  using (status = 'draft' and (public.can_see_finance() or (client_id is not null and public.can_see_client_invoices(client_id))));

create policy "invoice_shares: partners" on public.invoice_shares for all to authenticated
  using (public.can_see_finance()) with check (public.can_see_finance());

create policy "expenses: partners" on public.expenses for all to authenticated
  using (public.can_see_finance()) with check (public.can_see_finance());

grant select, insert, update, delete on public.invoice_issuers, public.invoice_buyers, public.invoices,
  public.invoice_shares, public.expenses to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
