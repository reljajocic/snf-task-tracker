import "server-only";
import { cache } from "react";
import { requireProfile } from "@/lib/auth";
import type { Buyer, Expense, Invoice, Issuer, Share } from "@/lib/invoices";
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

export async function getShares(invoiceId?: string): Promise<Share[]> {
  const supabase = await createClient();
  let q = supabase.from("invoice_shares").select("invoice_id, profile_id, amount");
  if (invoiceId) q = q.eq("invoice_id", invoiceId);
  const { data } = await q;
  return (data ?? []).map((s) => ({ ...s, amount: num(s.amount) }));
}

export async function getExpenses(): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, spent_on, description, amount, supplier, client_id, profile_id, doc_url")
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((e) => ({ ...e, amount: num(e.amount) }));
}
