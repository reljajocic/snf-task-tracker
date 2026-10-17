// Invoices, expenses and partner earnings: shapes, money formatting and the monthly math.
// Pure (no server imports), so the page, the PDF view and the tests share it.

export type InvoiceItem = { description: string; quantity: number; price: number };
export type InvoiceStatus = "draft" | "issued" | "cancelled";
export type Currency = "RSD" | "EUR";

export type Issuer = { id: string; name: string; address: string; pib: string; mb: string; account: string; place: string; footer: string; owner_id: string | null; is_active: boolean };
export type Buyer = { id: string; name: string; address: string; pib: string; mb: string; client_id: string | null };

export type Invoice = {
  id: string;
  issuer_id: string;
  year: number | null;
  seq: number | null;
  buyer_id: string;
  client_id: string | null;
  status: InvoiceStatus;
  issued_on: string;
  due_days: number;
  currency: Currency;
  eur_rate: number | null;
  items: InvoiceItem[];
  total_rsd: number;
  note: string | null;
  paid_on: string | null;
  pdf_url: string | null;
  /** As printed on issue: { name, address, pib, mb } and the issuer's { …, account, place, footer }. */
  buyer_snapshot: Partial<Buyer> | null;
  issuer_snapshot: Partial<Issuer> | null;
};

export type Share = { invoice_id: string; profile_id: string; amount: number };
export type Expense = {
  id: string;
  spent_on: string;
  description: string;
  amount: number;
  supplier: string | null;
  client_id: string | null;
  profile_id: string | null;
  doc_url: string | null;
};

export const DEFAULT_ITEM = "Održavanje Veb Portala";

/** 2026/031 — or null for a draft. */
export function invoiceNumber(inv: Pick<Invoice, "year" | "seq">): string | null {
  return inv.year && inv.seq ? `${inv.year}/${String(inv.seq).padStart(3, "0")}` : null;
}

/** Serbian money: 17.608,25 */
export function money(n: number, decimals = 2): string {
  return new Intl.NumberFormat("sr-Latn-RS", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

/** 17. 10. 2026. — how dates read on the invoice. */
export function invoiceDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}. ${m}. ${y}.`;
}

export const itemsTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

/** Same rounding as the database: items in the invoice currency, converted at the NBS rate. */
export function totalRsd(items: InvoiceItem[], currency: Currency, rate: number | null): number {
  const sub = itemsTotal(items);
  return Math.round((currency === "EUR" ? sub * (rate ?? 0) : sub) * 100) / 100;
}

/** An item's price and value as printed (always dinars). */
export const rsd = (amount: number, currency: Currency, rate: number | null) =>
  Math.round((currency === "EUR" ? amount * (rate ?? 0) : amount) * 100) / 100;

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type PayState = "draft" | "cancelled" | "paid" | "overdue" | "waiting";

/** Where the money is: paid, waiting (within the term) or overdue (past it, with days late). */
export function payState(inv: Pick<Invoice, "status" | "paid_on" | "issued_on" | "due_days">, today: string): { state: PayState; due: string; daysLate: number } {
  const due = addDays(inv.issued_on, inv.due_days);
  if (inv.status === "draft") return { state: "draft", due, daysLate: 0 };
  if (inv.status === "cancelled") return { state: "cancelled", due, daysLate: 0 };
  if (inv.paid_on) return { state: "paid", due, daysLate: 0 };
  const late = Math.round((Date.parse(today) - Date.parse(due)) / 86_400_000);
  return late > 0 ? { state: "overdue", due, daysLate: late } : { state: "waiting", due, daysLate: 0 };
}

/** Counts toward the books: issued (not drafts, not cancelled). */
export const counts = (inv: Pick<Invoice, "status">) => inv.status === "issued";

export type PartnerMonth = {
  invoiced: number; // their share of what was invoiced that month
  collected: number; // …of that, already paid
  outstanding: number;
  expenses: number; // their part of the month's costs
  net: number; // collected − expenses (as the old sheet did)
};

export type MonthRow = { month: string; total: { invoiced: number; collected: number; expenses: number }; byPartner: Record<string, PartnerMonth> };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Per month (YYYY-MM, newest first), per partner: invoiced, collected, open, costs and net.
 * Invoices count in the month they were issued; costs in the month they were paid.
 * A cost with no person is split evenly between the partners.
 */
export function monthlyEarnings(invoices: Invoice[], shares: Share[], expenses: Expense[], partnerIds: string[]): MonthRow[] {
  const rows = new Map<string, MonthRow>();
  const row = (month: string) => {
    let r = rows.get(month);
    if (!r) {
      r = { month, total: { invoiced: 0, collected: 0, expenses: 0 }, byPartner: {} };
      for (const p of partnerIds) r.byPartner[p] = { invoiced: 0, collected: 0, outstanding: 0, expenses: 0, net: 0 };
      rows.set(month, r);
    }
    return r;
  };
  const byInvoice = new Map<string, Share[]>();
  for (const s of shares) byInvoice.set(s.invoice_id, [...(byInvoice.get(s.invoice_id) ?? []), s]);

  for (const inv of invoices) {
    if (!counts(inv)) continue;
    const r = row(inv.issued_on.slice(0, 7));
    r.total.invoiced += Number(inv.total_rsd);
    if (inv.paid_on) r.total.collected += Number(inv.total_rsd);
    for (const s of byInvoice.get(inv.id) ?? []) {
      const p = r.byPartner[s.profile_id];
      if (!p) continue;
      p.invoiced += Number(s.amount);
      if (inv.paid_on) p.collected += Number(s.amount);
    }
  }
  for (const e of expenses) {
    const r = row(e.spent_on.slice(0, 7));
    r.total.expenses += Number(e.amount);
    const who = e.profile_id && r.byPartner[e.profile_id] ? [e.profile_id] : partnerIds;
    for (const p of who) r.byPartner[p].expenses += Number(e.amount) / who.length;
  }
  for (const r of rows.values()) {
    r.total = { invoiced: round2(r.total.invoiced), collected: round2(r.total.collected), expenses: round2(r.total.expenses) };
    for (const p of Object.values(r.byPartner)) {
      p.invoiced = round2(p.invoiced);
      p.collected = round2(p.collected);
      p.expenses = round2(p.expenses);
      p.outstanding = round2(p.invoiced - p.collected);
      p.net = round2(p.collected - p.expenses);
    }
  }
  return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
}

/** Quick splits offered on an invoice (the custom one is typed in). */
export function presetShares(total: number, partnerIds: string[], preset: "even" | string): Record<string, number> {
  if (preset === "even") {
    const each = Math.floor((total / partnerIds.length) * 100) / 100;
    const out: Record<string, number> = {};
    partnerIds.forEach((p, i) => (out[p] = i === 0 ? round2(total - each * (partnerIds.length - 1)) : each));
    return out;
  }
  return Object.fromEntries(partnerIds.map((p) => [p, p === preset ? total : 0]));
}

/** The invoice itself is a Serbian legal document, so its wording stays Serbian whatever the app language. */
export const INVOICE_TEXT = {
  number: "Broj fakture",
  date: "Datum prometa",
  due: (days: number) => `Rok za plaćanje: ${days} dana`,
  place: "Mesto izdavanja",
  buyer: "Kupac",
  address: "Adresa",
  pib: "PIB",
  mb: "Matični broj",
  account: "Tekući račun",
  cols: ["Redni broj", "Opis usluge", "Količina", "Cena", "Valuta", "Ukupna vrednost"],
  total: "Ukupno za uplatu",
  signature: "Potpis izdavaoca",
  rate: (date: string, rate: string) => `*Srednji kurs za ${date} je ${rate}`,
} as const;

/** File name for the saved PDF: 2026-031 Semaco */
export function invoiceFileName(inv: Pick<Invoice, "year" | "seq">, buyerName: string): string {
  const n = invoiceNumber(inv)?.replace("/", "-") ?? "nacrt";
  return `${n} ${buyerName}`.replace(/["/\\:*?<>|]+/g, "").trim();
}
