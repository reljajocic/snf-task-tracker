import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { getLookups } from "@/lib/data";
import { formatDate, today as getToday } from "@/lib/dates";
import { getExpenses, getInvoiceAccess, getPartners, getSubscriptions } from "@/lib/finance";
import { money } from "@/lib/invoices";
import { InvoicesHeader } from "../parts";

// Costs, by month. Three views: all costs, the invoices we received (with what's still to pay),
// and the subscriptions that post a cost every month. A row opens the cost (or subscription) on its own page.
// URL: ?view=received | subscriptions
export default async function ExpensesPage({ searchParams }: PageProps<"/invoices/expenses">) {
  const [params, access] = await Promise.all([searchParams, getInvoiceAccess()]);
  if (!access.finance) redirect("/invoices");
  const view = params.view === "received" ? "received" : params.view === "subscriptions" ? "subscriptions" : "all";
  const [all, subs, lookups, partners, t, tAll] = await Promise.all([
    getExpenses(),
    getSubscriptions(),
    getLookups(),
    getPartners(),
    getTranslations("invoices"),
    getTranslations(),
  ]);
  const today = getToday();
  const expenses = view === "received" ? all.filter((e) => e.invoice_no) : all;
  const unpaid = all.filter((e) => e.invoice_no && !e.paid_on).length;
  const activeSubs = subs.filter((s) => !s.ends_on || s.ends_on > today);
  const clientName = new Map(lookups.clients.map((c) => [c.id, c.name]));
  const who = (id: string | null) => (id ? t("onlyFor", { name: partners.find((p) => p.id === id)?.full_name ?? "—" }) : t("everyone"));
  const monthLabel = (m: string) => `${tAll("month.name", { m: String(Number(m.slice(5))) })} ${m.slice(0, 4)}`;
  const months = [...new Set(expenses.map((e) => e.spent_on.slice(0, 7)))];
  const row = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-[18px] py-3 last:border-b-0 hover:bg-hover";

  return (
    <>
      <InvoicesHeader access={access} active="expenses" />
      <div className="flex flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            items={[
              { key: "all", label: t("viewAllCosts"), href: "/invoices/expenses", active: view === "all" },
              { key: "received", label: unpaid ? t("viewReceivedUnpaid", { n: unpaid }) : t("viewReceived"), href: "/invoices/expenses?view=received", active: view === "received" },
              { key: "subscriptions", label: t("subscriptionsCount", { n: activeSubs.length }), href: "/invoices/expenses?view=subscriptions", active: view === "subscriptions" },
            ]}
          />
          <div className="flex gap-2">
            <Link href="/invoices/expenses/subscriptions/new" className={buttonClass({ size: "sm", variant: "secondary" })}>{t("addSubscriptionShort")}</Link>
            <Link href="/invoices/expenses/new" className={buttonClass({ size: "sm" })}>{t("addExpenseShort")}</Link>
          </div>
        </div>

        {view === "subscriptions" ? (
          <section className="flex flex-col gap-3">
            <p className="text-[14px] text-ink2">{t("subscriptionLead")}</p>
            {subs.length ? (
              <div className="snf-stack">
                {subs.map((s) => {
                  const ended = !!s.ends_on && s.ends_on <= today;
                  return (
                    <Link key={s.id} href={`/invoices/expenses/subscriptions/${s.id}`} className={`${row} lg:grid-cols-[minmax(0,1fr)_170px_150px_150px_130px] ${ended ? "opacity-55" : ""}`}>
                      <span className="flex min-w-0 flex-col gap-[3px]">
                        <span className="truncate text-[15px] font-medium">{s.name}</span>
                        <span className="truncate text-[13px] text-ink3">
                          {ended ? t("subEnded", { date: formatDate(s.ends_on!) }) : t("subEvery", { day: s.day_of_month })}
                          {s.supplier ? ` · ${s.supplier}` : ""}
                        </span>
                      </span>
                      <span className="hidden text-[13px] text-ink2 lg:block">{t("subSince", { date: formatDate(s.starts_on) })}</span>
                      <span className="hidden truncate text-[13px] text-ink2 lg:block">{s.client_id ? clientName.get(s.client_id) : ""}</span>
                      <span className="hidden truncate text-[13px] text-ink2 lg:block">{who(s.profile_id)}</span>
                      <span className="justify-self-end text-[15px] font-semibold tabular-nums">
                        {money(s.amount)} <span className="text-[12px] font-medium text-ink3">{t("perMonth")}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("noSubscriptions")}</p>
            )}
          </section>
        ) : months.length ? (
          months.map((m) => {
            const list = expenses.filter((e) => e.spent_on.startsWith(m));
            return (
              <section key={m} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{monthLabel(m)}</h2>
                  <span className="text-[15px] font-semibold tabular-nums">{money(list.reduce((s, e) => s + e.amount, 0))} RSD</span>
                </div>
                <div className="snf-stack">
                  {list.map((e) => (
                    <Link key={e.id} href={`/invoices/expenses/${e.id}`} className={`${row} lg:grid-cols-[90px_minmax(0,1fr)_160px_150px_130px]`}>
                      <span className="hidden text-[14px] tabular-nums text-ink3 lg:block">{formatDate(e.spent_on)}</span>
                      <span className="flex min-w-0 flex-col gap-[3px]">
                        <span className="truncate text-[15px] font-medium">{e.description}</span>
                        {(e.supplier || e.invoice_no || e.subscription_id) && (
                          <span className="truncate text-[13px] text-ink3">
                            {e.subscription_id && <span className="mr-2 font-medium text-ink2">{t("subscriptionBadge")}</span>}
                            {e.invoice_no && (
                              <span className={`mr-2 font-medium ${e.paid_on ? "text-ink2" : "text-red-ink"}`}>
                                {t("receivedLine", { no: e.invoice_no })} · {e.paid_on ? t("receivedPaid", { date: formatDate(e.paid_on) }) : t("receivedUnpaid")}
                              </span>
                            )}
                            {e.supplier}
                          </span>
                        )}
                      </span>
                      <span className="hidden truncate text-[13px] text-ink2 lg:block">{e.client_id ? clientName.get(e.client_id) : ""}</span>
                      <span className="hidden truncate text-[13px] text-ink2 lg:block">{who(e.profile_id)}</span>
                      <span className="justify-self-end text-[15px] font-semibold tabular-nums">{money(e.amount)}</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("noExpenses")}</p>
        )}
      </div>
    </>
  );
}
