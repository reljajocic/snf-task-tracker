import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { requireProfile } from "@/lib/auth";
import { today as getToday } from "@/lib/dates";
import { getExpenses, getInvoiceAccess, getInvoices, getPeople, getShares } from "@/lib/finance";
import { money, monthlyEarnings, type PartnerMonth } from "@/lib/invoices";
import { InvoicesHeader, Stat } from "../parts";

const ZERO: PartnerMonth = { invoiced: 0, collected: 0, outstanding: 0, expenses: 0, net: 0 };
const add = (a: PartnerMonth, b: PartnerMonth): PartnerMonth => ({
  invoiced: a.invoiced + b.invoiced,
  collected: a.collected + b.collected,
  outstanding: a.outstanding + b.outstanding,
  expenses: a.expenses + b.expenses,
  net: a.net + b.net,
});

// What each person earned per month: their share of what was invoiced and collected,
// minus their part of the costs (partners only). Net counts only money that has come in.
// Two views of the same numbers: month by month (everyone in each month) or person by person (each one's months).
export default async function EarningsPage({ searchParams }: PageProps<"/invoices/earnings">) {
  const [params, access, me, t, tAll] = await Promise.all([searchParams, getInvoiceAccess(), requireProfile(), getTranslations("invoices"), getTranslations()]);
  if (!access.finance) redirect("/invoices");
  const byPerson = params.view === "person";
  const [invoices, shares, expenses, everyone] = await Promise.all([getInvoices(), getShares(), getExpenses(), getPeople()]);
  const partnerIds = everyone.filter((p) => p.is_partner).map((p) => p.id);
  const withShare = new Set(shares.filter((s) => s.amount > 0).map((s) => s.profile_id));
  const people = everyone.filter((p) => p.is_partner || withShare.has(p.id));
  const rows = monthlyEarnings(invoices, shares, expenses, partnerIds, people.map((p) => p.id));
  const month = getToday().slice(0, 7);
  const label = (m: string) => `${tAll("month.name", { m: String(Number(m.slice(5))) })} ${m.slice(0, 4)}`;
  const allTime = (pid: string) => rows.reduce((s, r) => add(s, r.byPartner[pid] ?? ZERO), ZERO);
  const mine = partnerIds.includes(me.id) ? rows.find((r) => r.month === month)?.byPartner[me.id] ?? null : null;

  const cols: { key: keyof PartnerMonth; label: string }[] = [
    { key: "invoiced", label: t("colInvoiced") },
    { key: "collected", label: t("colCollected") },
    { key: "outstanding", label: t("colOutstanding") },
    { key: "expenses", label: t("colExpenses") },
    { key: "net", label: t("colNet") },
  ];
  const grid = "md:grid-cols-[minmax(140px,1fr)_repeat(5,minmax(0,120px))]";

  const table = (key: string, title: ReactNode, lines: { key: string; head: ReactNode; data: PartnerMonth; strong?: boolean }[], sub?: string) => (
    <section key={key} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display flex items-center gap-2.5 text-[18px] leading-[1.1] lg:text-[20px]">{title}</h2>
        {sub && <span className="text-[13px] text-ink3">{sub}</span>}
      </div>
      <div className="snf-stack overflow-x-auto">
        <div className={`hidden gap-4 border-b border-line px-[18px] py-2.5 text-[12px] font-medium text-ink3 md:grid ${grid}`}>
          <span />
          {cols.map((c) => <span key={c.key} className="text-right">{c.label}</span>)}
        </div>
        {lines.map((l) => (
          <div key={l.key} className={`grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-line px-[18px] py-3 last:border-b-0 md:items-center ${grid} ${l.strong ? "bg-surf2" : ""}`}>
            <span className="col-span-2 flex items-center gap-2.5 md:col-span-1">{l.head}</span>
            {cols.map((c) => (
              <span key={c.key} className={`flex justify-between gap-2 text-[14px] tabular-nums md:block md:text-right ${c.key === "net" ? "font-semibold text-ink" : "text-ink2"}`}>
                <span className="text-[12px] text-ink3 md:hidden">{c.label}</span>
                {money(l.data[c.key], 0)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );

  const personHead = (p: (typeof people)[number]) => (
    <>
      <Avatar person={p} size={26} />
      <span className="truncate text-[15px] font-medium">{p.full_name}</span>
    </>
  );
  const monthHead = (m: string, strong = false) => <span className={`truncate text-[15px] ${strong ? "font-semibold" : "font-medium"}`}>{m}</span>;

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
        <Segmented
          items={[
            { key: "month", label: t("viewByMonth"), href: "/invoices/earnings", active: !byPerson },
            { key: "person", label: t("viewByPerson"), href: "/invoices/earnings?view=person", active: byPerson },
          ]}
        />
        {!rows.length ? (
          <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("noEarnings")}</p>
        ) : byPerson ? (
          people.map((p) =>
            table(
              p.id,
              personHead(p),
              [
                ...rows
                  .filter((r) => p.is_partner || Object.values(r.byPartner[p.id] ?? ZERO).some((v) => v !== 0))
                  .map((r) => ({ key: r.month, head: monthHead(label(r.month)), data: r.byPartner[p.id] ?? ZERO })),
                { key: "all", head: monthHead(t("allTime"), true), data: allTime(p.id), strong: true },
              ],
              p.is_partner ? undefined : t("notPartner"),
            ),
          )
        ) : (
          <>
            {table("all", t("allTime"), people.map((p) => ({ key: p.id, head: personHead(p), data: allTime(p.id) })))}
            {rows.map((r) =>
              table(
                r.month,
                label(r.month),
                people.map((p) => ({ key: p.id, head: personHead(p), data: r.byPartner[p.id] ?? ZERO })),
                t("monthTotals", { invoiced: money(r.total.invoiced, 0), collected: money(r.total.collected, 0), expenses: money(r.total.expenses, 0) }),
              ),
            )}
          </>
        )}
      </div>
    </>
  );
}
