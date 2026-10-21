"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { getInvoiceAccess } from "@/lib/finance";
import type { Currency, InvoiceItem } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";

// RLS decides who may touch what (partners everything, picked managers their client's invoices).
// These actions shape the input and report errors.

export type BuyerInput = { id: string | null; name: string; address: string; pib: string; mb: string; client_id: string | null };
export type InvoiceInput = {
  id: string | null;
  issuer_id: string;
  buyer: BuyerInput;
  issued_on: string;
  due_days: number;
  currency: Currency;
  eur_rate: number | null;
  items: InvoiceItem[];
  note: string | null;
  paid_on: string | null;
  pdf_url: string | null;
  /** Partner → dinars. Null leaves the split as it is (managers can't see or set it). */
  shares: Record<string, number> | null;
  issue: boolean;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clean = (s: string | null | undefined) => (s ?? "").trim();
const done = () => {
  revalidatePath("/invoices", "layout");
  return null;
};

export async function saveInvoice(input: InvoiceInput): Promise<{ error: string | null; id?: string }> {
  const me = await requireProfile();
  const supabase = await createClient();

  const items = input.items
    .map((i) => ({ description: clean(i.description), quantity: Number(i.quantity) || 0, price: Number(i.price) || 0 }))
    .filter((i) => i.description);
  if (!items.length) return { error: "Add at least one line." };
  if (!clean(input.buyer.name)) return { error: "Who is the invoice for?" };
  if (!ISO.test(input.issued_on)) return { error: "Pick a date." };
  if (input.currency === "EUR" && !(Number(input.eur_rate) > 0)) return { error: "The euro rate is missing." };

  // The buyer: new, or its details updated in place (they're printed on the next invoice too).
  const buyerFields = {
    name: clean(input.buyer.name),
    address: clean(input.buyer.address),
    pib: clean(input.buyer.pib),
    mb: clean(input.buyer.mb),
    client_id: input.buyer.client_id || null,
  };
  let buyerId = input.buyer.id;
  if (buyerId) {
    const { error } = await supabase.from("invoice_buyers").update(buyerFields).eq("id", buyerId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("invoice_buyers").insert(buyerFields).select("id").single();
    if (error) return { error: error.message };
    buyerId = data.id;
  }

  const fields = {
    issuer_id: input.issuer_id,
    buyer_id: buyerId,
    issued_on: input.issued_on,
    due_days: Math.max(0, Math.round(Number(input.due_days) || 0)),
    currency: input.currency,
    eur_rate: input.currency === "EUR" ? Number(input.eur_rate) : null,
    items,
    note: clean(input.note) || null,
    paid_on: input.paid_on && ISO.test(input.paid_on) ? input.paid_on : null,
    pdf_url: clean(input.pdf_url) || null,
    ...(input.issue ? { status: "issued" as const } : {}),
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from("invoices").update(fields).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("invoices").insert({ ...fields, created_by: me.id }).select("id").single();
    if (error) return { error: error.message };
    id = data.id;
  }

  if (input.shares && (await getInvoiceAccess()).finance) {
    const { error } = await supabase.from("invoice_shares").delete().eq("invoice_id", id);
    if (error) return { error: error.message };
    const rows = Object.entries(input.shares)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([profile_id, amount]) => ({ invoice_id: id!, profile_id, amount: Math.round(Number(amount) * 100) / 100 }));
    if (rows.length) {
      const { error: e2 } = await supabase.from("invoice_shares").insert(rows);
      if (e2) return { error: e2.message };
    }
  }

  done();
  return { error: null, id: id ?? undefined };
}

export async function markPaid(id: string, paidOn: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ paid_on: paidOn && ISO.test(paidOn) ? paidOn : null }).eq("id", id);
  done();
  return { error: error?.message ?? null };
}

export async function cancelInvoice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
  done();
  return { error: error?.message ?? null };
}

export async function deleteDraft(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("status", "draft");
  done();
  return { error: error?.message ?? null };
}

/** NBS middle rate for the euro on a day (the rate the old invoices quote). Null when unavailable. */
export async function eurRate(date: string): Promise<number | null> {
  if (!ISO.test(date)) return null;
  try {
    const res = await fetch(`https://kurs.resenje.org/api/v1/currencies/eur/rates/${date}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { exchange_middle?: number };
    return typeof body.exchange_middle === "number" ? body.exchange_middle : null;
  } catch {
    return null;
  }
}

export type ExpenseInput = {
  id: string | null;
  spent_on: string;
  description: string;
  amount: number;
  supplier: string | null;
  client_id: string | null;
  profile_id: string | null;
  doc_url: string | null;
  invoice_no: string | null;
  paid_on: string | null;
};

export async function saveExpense(input: ExpenseInput) {
  const me = await requireProfile();
  const supabase = await createClient();
  if (!clean(input.description)) return { error: "What was it for?" };
  if (!(Number(input.amount) >= 0)) return { error: "Amount?" };
  const fields = {
    spent_on: ISO.test(input.spent_on) ? input.spent_on : new Date().toISOString().slice(0, 10),
    description: clean(input.description),
    amount: Math.round(Number(input.amount) * 100) / 100,
    supplier: clean(input.supplier) || null,
    client_id: input.client_id || null,
    profile_id: input.profile_id || null,
    doc_url: clean(input.doc_url) || null,
    invoice_no: clean(input.invoice_no) || null,
    paid_on: input.paid_on && ISO.test(input.paid_on) ? input.paid_on : null,
  };
  const { data, error } = input.id
    ? await supabase.from("expenses").update(fields).eq("id", input.id).select("id").single()
    : await supabase.from("expenses").insert({ ...fields, created_by: me.id }).select("id").single();
  done();
  return { error: error?.message ?? null, id: data?.id };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  done();
  return { error: error?.message ?? null };
}

export type SubscriptionInput = {
  id: string | null;
  name: string;
  amount: number;
  supplier: string | null;
  client_id: string | null;
  profile_id: string | null;
  day_of_month: number;
  starts_on: string;
  ends_on: string | null;
};

/** Saves a subscription and posts whatever months are due up to today (so a new one shows in the costs at once). */
export async function saveSubscription(input: SubscriptionInput): Promise<{ error: string | null; id?: string }> {
  const me = await requireProfile();
  const supabase = await createClient();
  if (!clean(input.name)) return { error: "What is it?" };
  if (!(Number(input.amount) > 0)) return { error: "Amount?" };
  const fields = {
    name: clean(input.name),
    amount: Math.round(Number(input.amount) * 100) / 100,
    supplier: clean(input.supplier) || null,
    client_id: input.client_id || null,
    profile_id: input.profile_id || null,
    day_of_month: Math.min(31, Math.max(1, Math.round(Number(input.day_of_month) || 1))),
    starts_on: ISO.test(input.starts_on) ? input.starts_on : new Date().toISOString().slice(0, 10),
    ends_on: input.ends_on && ISO.test(input.ends_on) ? input.ends_on : null,
  };
  const { data, error } = input.id
    ? await supabase.from("subscriptions").update(fields).eq("id", input.id).select("id").single()
    : await supabase.from("subscriptions").insert({ ...fields, created_by: me.id }).select("id").single();
  if (error) return { error: error.message };
  await supabase.rpc("post_subscriptions", {});
  done();
  return { error: null, id: data.id };
}

/** Stops a subscription from today: nothing more gets posted; what was posted stays. */
export async function endSubscription(id: string, today: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").update({ ends_on: today }).eq("id", id);
  done();
  return { error: error?.message ?? null };
}

/** A partner picks which of a client's managers see its invoices. */
export async function setSeesInvoices(clientId: string, userId: string, sees: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_sees_invoices", { cid: clientId, uid: userId, sees });
  revalidatePath(`/clients/${clientId}`);
  return { error: error?.message ?? null };
}
