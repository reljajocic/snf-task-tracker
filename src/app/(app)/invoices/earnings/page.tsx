import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/Avatar";
import { requireProfile } from "@/lib/auth";
import { today as getToday } from "@/lib/dates";
import { getExpenses, getInvoiceAccess, getInvoices, getPartners, getShares } from "@/lib/finance";
import { money, monthlyEarnings, type PartnerMonth } from "@/lib/invoices";
import { InvoicesHeader, Stat } from "../parts";

// What each partner earned per month: their share of what was invoiced and collected,
// minus their part of the costs. Net counts only money that has come in.
export default async function EarningsPage() {
  const [access, me, t, tAll] = await Promise.all([getInvoiceAccess(), requireProfile(), getTranslations("invoices"), getTranslations()]);
  if (!access.finance) redirect("/invoices");
  const [invoices, shares, expenses, partners] = await Promise.all([getInvoices(), getShares(), getExpenses(), getPartners()]);
  const ids = partners.map((p) => p.id);
  const rows = monthlyEarnings(invoices, shares, expenses, ids);
  const month = getToday().slice(0, 7);
  const label = (m: string) => `${tAll("month.name", { m: String(Number(m.slice(5))) })} ${m.slice(0, 4)}`;

  const sumOf = (pid: string, list = rows): PartnerMonth =>
    list.reduce(
      (s, r) => {
        const p = r.byPartner[pid];
        return { invoiced: s.invoiced + p.invoiced, collected: s.collected + p.collected, outstanding: s.outstanding + p.outstanding, expenses: s.expenses + p.expenses, net: s.net + p.net };
      },
      { invoiced: 0, collected: 0, outstanding: 0, expenses: 0, net: 0 },
    );
  const mine = ids.includes(me.id) ? rows.find((r) => r.month === month)?.byPartner[me.id] ?? null : null;

  const cols: { key: keyof PartnerMonth; label: string }[] = [
    { key: "invoiced", label: t("colInvoiced") },
    { key: "collected", label: t("colCollected") },
    { key: "outstanding", label: t("colOutstanding") },
    { key: "expenses", label: t("colExpenses") },
    { key: "net", label: t("colNet") },
  ];

  const table = (title: string, data: Record<string, PartnerMonth>, sub?: string) => (
    <section key={title} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{title}</h2>
        {sub && <span className="text-[13px] text-ink3">{sub}</span>}
      </div>
      <div className="snf-stack overflow-x-auto">
        <div className="hidden grid-cols-[minmax(140px,1fr)_repeat(5,minmax(0,120px))] gap-4 border-b border-line px-[18px] py-2.5 text-[12px] font-medium text-ink3 md:grid">
          <span />
          {cols.map((c) => <span key={c.key} className="text-right">{c.label}</span>)}
        </div>
        {partners.map((p) => (
          <div key={p.id} className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-line px-[18px] py-3 last:border-b-0 md:grid-cols-[minmax(140px,1fr)_repeat(5,minmax(0,120px))] md:items-center">
            <span className="col-span-2 flex items-center gap-2.5 md:col-span-1">
              <Avatar person={p} size={26} />
              <span className="truncate text-[15px] font-medium">{p.full_name}</span>
            </span>
            {cols.map((c) => (
              <span key={c.key} className={`flex justify-between gap-2 text-[14px] tabular-nums md:block md:text-right ${c.key === "net" ? "font-semibold text-ink" : "text-ink2"}`}>
                <span className="text-[12px] text-ink3 md:hidden">{c.label}</span>
                {money(data[p.id][c.key], 0)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <>
      <InvoicesHeader access={access} active="earnings" eyebrow={label(month)} />
      <div className="flex flex-col gap-9 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
        {mine && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("myNet")} value={mine.net} />
            <Stat label={t("colCollected")} value={mine.collected} />
            <Stat label={t("colOutstanding")} value={mine.outstanding} tone="red" />
            <Stat label={t("colExpenses")} value={mine.expenses} />
          </div>
        )}
        {rows.length ? (
          <>
            {table(t("allTime"), Object.fromEntries(ids.map((id) => [id, sumOf(id)])))}
            {rows.map((r) =>
              table(
                label(r.month),
                r.byPartner,
                t("monthTotals", { invoiced: money(r.total.invoiced, 0), collected: money(r.total.collected, 0), expenses: money(r.total.expenses, 0) }),
              ),
            )}
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("noEarnings")}</p>
        )}
      </div>
    </>
  );
}
