-- The issuer's signature, printed under "Potpis izdavaoca". Kept in the database (never in the public repo)
-- and in its own table, so the issuer list stays light and the image is read only where an invoice is printed.
create table public.invoice_signatures (
  issuer_id  uuid primary key references public.invoice_issuers (id) on delete cascade,
  image      text not null check (image like 'data:image/png;base64,%'), -- transparent PNG
  updated_at timestamptz not null default now()
);

alter table public.invoice_signatures enable row level security;

-- Same people who read the issuer (they print its invoices); only partners change it.
create policy "invoice_signatures: read" on public.invoice_signatures for select to authenticated
  using (public.can_see_finance() or exists (
    select 1 from public.client_members
    where user_id = (select auth.uid()) and role = 'manager' and sees_invoices));
create policy "invoice_signatures: write" on public.invoice_signatures for all to authenticated
  using (public.can_see_finance()) with check (public.can_see_finance());

grant select, insert, update, delete on public.invoice_signatures to authenticated, service_role;
