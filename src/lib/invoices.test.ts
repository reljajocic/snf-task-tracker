import { describe, expect, it } from "vitest";
import { invoiceNumber, monthlyEarnings, money, payState, presetShares, totalRsd, type Expense, type Invoice } from "./invoices";

const R = "relja";
const M = "marko";
const inv = (id: string, issued_on: string, total_rsd: number, extra: Partial<Invoice> = {}): Invoice => ({
  id,
  issuer_id: "i",
  year: 2026,
  seq: 1,
  buyer_id: "b",
  client_id: null,
  status: "issued",
  issued_on,
  due_days: 7,
  currency: "RSD",
  eur_rate: null,
  items: [],
  total_rsd,
  note: null,
  paid_on: null,
  pdf_url: null,
  buyer_snapshot: null,
  issuer_snapshot: null,
  ...extra,
});
const exp = (spent_on: string, amount: number, profile_id: string | null = null): Expense => ({
  id: spent_on + amount,
  spent_on,
  description: "x",
  amount,
  supplier: null,
  client_id: null,
  profile_id,
  doc_url: null,
});

describe("invoices", () => {
  it("numbers and money read like the old invoices", () => {
    expect(invoiceNumber({ year: 2026, seq: 31 })).toBe("2026/031");
    expect(invoiceNumber({ year: null, seq: null })).toBeNull();
    expect(money(17608.25)).toBe("17.608,25");
    expect(totalRsd([{ description: "x", quantity: 1, price: 150 }], "EUR", 117.3883)).toBe(17608.25);
  });

  it("knows what's paid, waiting and late", () => {
    const base = inv("a", "2026-10-01", 100);
    expect(payState(base, "2026-10-08")).toEqual({ state: "waiting", due: "2026-10-08", daysLate: 0 });
    expect(payState(base, "2026-10-11")).toEqual({ state: "overdue", due: "2026-10-08", daysLate: 3 });
    expect(payState({ ...base, paid_on: "2026-10-20" }, "2026-10-30").state).toBe("paid");
    expect(payState({ ...base, status: "cancelled" }, "2026-10-30").state).toBe("cancelled");
  });

  it("monthly earnings: shares by issue month, costs split between partners, net from what's collected", () => {
    const invoices = [
      inv("a", "2026-07-06", 70417, { paid_on: "2026-07-07" }),
      inv("b", "2026-07-22", 29350), // not paid yet
      inv("c", "2026-07-30", 0, { status: "cancelled" }),
      inv("d", "2026-08-24", 176050, { paid_on: "2026-08-24" }),
    ];
    const shares = [
      { invoice_id: "a", profile_id: R, amount: 35208.5 },
      { invoice_id: "a", profile_id: M, amount: 35208.5 },
      { invoice_id: "b", profile_id: R, amount: 29350 },
      { invoice_id: "d", profile_id: R, amount: 88025 },
      { invoice_id: "d", profile_id: M, amount: 88025 },
    ];
    const rows = monthlyEarnings(invoices, shares, [exp("2026-07-31", 4720), exp("2026-07-31", 1000, M)], [R, M]);
    expect(rows.map((r) => r.month)).toEqual(["2026-08", "2026-07"]);
    const jul = rows[1];
    expect(jul.total).toEqual({ invoiced: 99767, collected: 70417, expenses: 5720 });
    expect(jul.byPartner[R]).toEqual({ invoiced: 64558.5, collected: 35208.5, outstanding: 29350, expenses: 2360, net: 32848.5 });
    expect(jul.byPartner[M]).toEqual({ invoiced: 35208.5, collected: 35208.5, outstanding: 0, expenses: 3360, net: 31848.5 });
  });

  it("even split keeps every dinar", () => {
    expect(presetShares(140891.77, [R, M], "even")).toEqual({ [R]: 70445.89, [M]: 70445.88 });
    expect(presetShares(100, [R, M], M)).toEqual({ [R]: 0, [M]: 100 });
  });
});
