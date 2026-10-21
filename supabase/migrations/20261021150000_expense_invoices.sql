-- Invoices we receive (a supplier bills us): a cost can carry the supplier's invoice number and the day we paid it.
-- An invoice number without a paid date is still to pay. Same access as the costs themselves (partners).
alter table public.expenses
  add column invoice_no text check (invoice_no is null or length(trim(invoice_no)) > 0),
  add column paid_on date;
