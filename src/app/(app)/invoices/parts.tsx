import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import type { InvoiceAccess } from "@/lib/finance";
import { money, type PayState } from "@/lib/invoices";

/** Header shared by the invoice pages: Invoices / Costs / Earnings (the last two for partners). */
export async function InvoicesHeader({ access, active, eyebrow }: { access: InvoiceAccess; active: "list" | "expenses" | "earnings"; eyebrow?: string }) {
  const t = await getTranslations("invoices");
  return (
    <>
      <PageHeader
        title={t(active === "list" ? "title" : active === "expenses" ? "expensesTitle" : "earningsTitle")}
        eyebrow={eyebrow}
        newTask={false}
        actions={
          active === "list" ? (
            <Link href="/invoices/new" className={buttonClass({ size: "sm" })}>
              {t("new")}
            </Link>
          ) : undefined
        }
      />
      {access.finance && (
        <div className="px-5 pb-5 lg:px-10">
          <Segmented
            items={[
              { key: "list", label: t("tabInvoices"), href: "/invoices", active: active === "list" },
              { key: "expenses", label: t("tabExpenses"), href: "/invoices/expenses", active: active === "expenses" },
              { key: "earnings", label: t("tabEarnings"), href: "/invoices/earnings", active: active === "earnings" },
            ]}
          />
        </div>
      )}
    </>
  );
}

const TONE: Record<PayState, string> = {
  paid: "text-ink2",
  waiting: "text-ink",
  overdue: "text-red-ink",
  draft: "text-ink3",
  cancelled: "text-ink3 line-through",
};
const DOT: Record<PayState, string> = {
  paid: "var(--status-done)",
  waiting: "var(--status-in-progress)",
  overdue: "var(--red-ink)",
  draft: "var(--ink3)",
  cancelled: "var(--ink3)",
};

export async function PayBadge({ state, daysLate }: { state: PayState; daysLate: number }) {
  const t = await getTranslations("invoices");
  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium ${TONE[state]}`}>
      <span className="size-2 flex-none rounded-full" style={{ background: DOT[state] }} />
      {state === "overdue" ? t("lateDays", { count: daysLate }) : t(`state.${state}`)}
    </span>
  );
}

export function Stat({ label, value, tone }: { label: string; value: number; tone?: "red" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-surf px-4 py-3.5">
      <span className="text-[13px] font-medium text-ink3">{label}</span>
      <span className={`text-[20px] font-semibold tabular-nums leading-none lg:text-[22px] ${tone === "red" && value > 0 ? "text-red-ink" : ""}`}>
        {money(value, 0)} <span className="text-[13px] font-medium text-ink3">RSD</span>
      </span>
    </div>
  );
}
