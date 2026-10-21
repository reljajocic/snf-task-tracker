import "server-only";
import { cache } from "react";
import { requireProfile } from "@/lib/auth";
import type { Buyer, Expense, Invoice, Issuer, Share, Subscription } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";

// Loads invoices and the money around them through RLS: partners and admins get everything,
// a manager picked for a client gets that client's invoices, everyone else gets nothing.

export type InvoiceAccess = { finance: boolean; clientIds: string[]; any: boolean };

export const getInvoiceAccess = cache(async (): Promise<InvoiceAccess> => {
  const me = await requireProfile();
  const supabase = await createClient();
  const [{ data: finance }, { data: picked }] = await Promise.all([
    supabase.rpc("can_see_finance"),
    supabase.from("client_members").select("client_id").eq("user_id", me.id).eq("role", "manager").eq("sees_invoices", true),
  ]);
  const clientIds = (picked ?? []).map((m) => m.client_id);
  return { finance: !!finance, clientIds, any: !!finance || clientIds.length > 0 };
});

const num = (v: unknown) => Number(v ?? 0);

function toInvoice(r: Record<string, unknown>): Invoice {
  return {
    ...(r as unknown as Invoice),
    total_rsd: num(r.total_rsd),
    eur_rate: r.eur_rate == null ? null : num(r.eur_rate),
    items: Array.isArray(r.items) ? (r.items as Invoice["items"]) : [],
  };
}

const INVOICE_COLUMNS = "id, issuer_id, year, seq, buyer_id, client_id, status, issued_on, due_days, currency, eur_rate, items, total_rsd, note, paid_on, pdf_url, buyer_snapshot, issuer_snapshot";

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select(INVOICE_COLUMNS).order("issued_on", { ascending: false }).order("seq", { ascending: false });
  return (data ?? []).map(toInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select(INVOICE_COLUMNS).eq("id", id).maybeSingle();
  return data ? toInvoice(data) : null;
}

export async function getBuyers(): Promise<Buyer[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoice_buyers").select("id, name, address, pib, mb, client_id").order("name");
  return data ?? [];
}

export async function getIssuers(): Promise<Issuer[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoice_issuers").select("id, name, address, pib, mb, account, place, footer, owner_id, is_active").order("created_at");
  return data ?? [];
}

/** The issuer's signature as a data URL (RLS: whoever may print its invoices), or null. */
export async function getSignature(issuerId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoice_signatures").select("image").eq("issuer_id", issuerId).maybeSingle();
  return data?.image ?? null;
}

/** An invoice with the issuer and buyer as printed on it (the snapshot wins over today's details) and the signature. */
export async function getInvoiceDocument(id: string) {
  const [invoice, issuers, buyers] = await Promise.all([getInvoice(id), getIssuers(), getBuyers()]);
  if (!invoice) return null;
  const issuer = { ...issuers.find((i) => i.id === invoice.issuer_id), ...invoice.issuer_snapshot };
  const buyer = { ...buyers.find((b) => b.id === invoice.buyer_id), ...invoice.buyer_snapshot };
  return { invoice, issuer, buyer, signature: await getSignature(invoice.issuer_id) };
}

export type Partner = { id: string; full_name: string; initials: string; avatar_bg: string; avatar_fg: string; avatar_url: string | null };

/** People who share the earnings (RLS: anyone may read profiles). */
export async function getPartners(): Promise<Partner[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, initials, avatar_bg, avatar_fg, avatar_url")
    .eq("is_partner", true)
    .eq("is_active", true)
    .order("full_name");
  return data ?? [];
}

/** Everyone active who can be given a share of an invoice (partners first); the "Admin" login is left out. */
export async function getPeople(): Promise<(Partner & { is_partner: boolean })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, initials, avatar_bg, avatar_fg, avatar_url, is_partner, role")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? [])
    .filter((p) => p.is_partner || p.role !== "admin")
    .sort((a, b) => Number(b.is_partner) - Number(a.is_partner))
    .map((p) => ({ id: p.id, full_name: p.full_name, initials: p.initials, avatar_bg: p.avatar_bg, avatar_fg: p.avatar_fg, avatar_url: p.avatar_url, is_partner: p.is_partner }));
}

export async function getShares(invoiceId?: string): Promise<Share[]> {
  const supabase = await createClient();
  let q = supabase.from("invoice_shares").select("invoice_id, profile_id, amount");
  if (invoiceId) q = q.eq("invoice_id", invoiceId);
  const { data } = await q;
  return (data ?? []).map((s) => ({ ...s, amount: num(s.amount) }));
}

const EXPENSE_COLUMNS = "id, spent_on, description, amount, supplier, client_id, profile_id, doc_url, invoice_no, paid_on, subscription_id";

export async function getExpense(id: string): Promise<Expense | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select(EXPENSE_COLUMNS).eq("id", id).maybeSingle();
  return data ? { ...data, amount: num(data.amount) } : null;
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id, name, amount, supplier, client_id, profile_id, day_of_month, starts_on, ends_on")
    .order("ends_on", { nullsFirst: true })
    .order("name");
  return (data ?? []).map((s) => ({ ...s, amount: num(s.amount) }));
}

export async function getExpenses(): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((e) => ({ ...e, amount: num(e.amount) }));
}
