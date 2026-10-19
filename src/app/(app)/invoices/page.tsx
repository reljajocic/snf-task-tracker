import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AvatarStack } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { getLookups } from "@/lib/data";
import { formatDate, today as getToday } from "@/lib/dates";
import { getBuyers, getInvoiceAccess, getInvoices, getPeople, getShares } from "@/lib/finance";
import { invoiceNumber, money, payState } from "@/lib/invoices";
import { MarkPaid } from "./MarkPaid";
import { InvoicesHeader, PayBadge, Stat } from "./parts";

const FILTERS = ["all", "open", "paid"] as const;

// URL: ?show=all|open|paid  &client=<id>
export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const [params, access, t] = await Promise.all([searchParams, getInvoiceAccess(), getTranslations("invoices")]);
  if (!access.any) redirect("/");
  const [invoices, buyers, lookups, shares, partners] = await Promise.all([
    getInvoices(),
    getBuyers(),
    getLookups(),
    access.finance ? getShares() : Promise.resolve([]),
    access.finance ? getPeople() : Promise.resolve([]),
  ]);
  const today = getToday();
  const show = FILTERS.find((f) => f === params.show) ?? "all";
  const clientId = typeof params.client === "string" && lookups.clients.some((c) => c.id === params.client) ? params.client : null;

  const buyerOf = new Map(buyers.map((b) => [b.id, b]));
  const clientName = new Map(lookups.clients.map((c) => [c.id, c.name]));
  const rows = invoices
    .filter((i) => !clientId || i.client_id === clientId)
    .map((i) => ({ inv: i, pay: payState(i, today) }));

  const open = rows.filter((r) => r.pay.state === "waiting" || r.pay.state === "overdue");
  const overdue = rows.filter((r) => r.pay.state === "overdue");
  const month = today.slice(0, 7);
  const paidThisMonth = rows.filter((r) => r.pay.state === "paid" && r.inv.paid_on?.startsWith(month));
  const sum = (list: typeof rows) => list.reduce((s, r) => s + r.inv.total_rsd, 0);

  const shown = rows.filter((r) =>
    show === "open" ? r.pay.state === "waiting" || r.pay.state === "overdue" || r.pay.state === "draft" : show === "paid" ? r.pay.state === "paid" : true,
  );
  const href = (s: string) => `/invoices?show=${s}${clientId ? `&client=${clientId}` : ""}`;

  return (
    <>
      <InvoicesHeader access={access} active="list" eyebrow={clientId ? clientName.get(clientId) : t("eyebrow", { count: rows.filter((r) => r.inv.status !== "draft").length })} />
      <div className="flex flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={t("statOpen", { count: open.length })} value={sum(open)} />
          <Stat label={t("statOverdue", { count: overdue.length })} value={sum(overdue)} tone="red" />
          <Stat label={t("statPaidMonth")} value={sum(paidThisMonth)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented items={FILTERS.map((f) => ({ key: f, label: t(`filter.${f}`), href: href(f), active: show === f }))} />
          {clientId && (
            <Link href={`/invoices?show=${show}`} className="text-[14px] font-medium text-ink3 hover:text-ink">
              {t("allClients")} ×
            </Link>
          )}
        </div>

        {shown.length ? (
          <div className="snf-stack">
            {shown.map(({ inv, pay }) => {
              const buyer = buyerOf.get(inv.buyer_id);
              const split = shares.filter((s) => s.invoice_id === inv.id).map((s) => partners.find((p) => p.id === s.profile_id)).filter((p) => !!p);
              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-line px-[18px] py-3.5 last:border-b-0 hover:bg-hover lg:grid-cols-[90px_minmax(0,1fr)_96px_140px_150px_56px_96px]"
                >
                  <span className="hidden text-[14px] font-semibold tabular-nums lg:block">{invoiceNumber(inv) ?? t("draft")}</span>
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="truncate text-[15px] font-medium leading-snug">{buyer?.name ?? "—"}</span>
                    <span className="truncate text-[13px] text-ink3">
                      <span className="lg:hidden">{invoiceNumber(inv) ?? t("draft")} · {formatDate(inv.issued_on)}</span>
                      {inv.client_id && clientName.get(inv.client_id) && <span className="hidden lg:inline">{clientName.get(inv.client_id)}</span>}
                    </span>
                  </span>
                  <span className="hidden text-[14px] tabular-nums text-ink2 lg:block">{formatDate(inv.issued_on)}</span>
                  <span className={`justify-self-end text-[15px] font-semibold tabular-nums ${inv.status === "cancelled" ? "text-ink3 line-through" : ""}`}>{money(inv.total_rsd)}</span>
                  <span className="col-start-1 lg:col-start-auto">
                    <PayBadge state={pay.state} daysLate={pay.daysLate} />
                  </span>
                  <span className="hidden lg:block">{access.finance && <AvatarStack people={split} size={24} />}</span>
                  <span className="justify-self-end">{(pay.state === "waiting" || pay.state === "overdue") && <MarkPaid id={inv.id} today={today} />}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("none")}</p>
        )}
      </div>
    </>
  );
}
