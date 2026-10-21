import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { Segmented } from "@/components/ui/Segmented";
import { getExpenses, getInvoiceAccess, getPartners } from "@/lib/finance";
import { InvoicesHeader } from "../parts";
import { Expenses } from "./Expenses";

// URL: ?view=received shows only the invoices we received (costs with a supplier's invoice number).
export default async function ExpensesPage({ searchParams }: PageProps<"/invoices/expenses">) {
  const [params, access] = await Promise.all([searchParams, getInvoiceAccess()]);
  if (!access.finance) redirect("/invoices");
  const received = params.view === "received";
  const [all, lookups, partners, t] = await Promise.all([getExpenses(), getLookups(), getPartners(), getTranslations()]);
  const expenses = received ? all.filter((e) => e.invoice_no) : all;
  const unpaid = all.filter((e) => e.invoice_no && !e.paid_on).length;
  const monthLabels = Object.fromEntries(
    [...new Set(expenses.map((e) => e.spent_on.slice(0, 7)))].map((m) => [m, `${t("month.name", { m: String(Number(m.slice(5))) })} ${m.slice(0, 4)}`]),
  );

  return (
    <>
      <InvoicesHeader access={access} active="expenses" />
      <div className="flex flex-col gap-5 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
        <Segmented
          items={[
            { key: "all", label: t("invoices.viewAllCosts"), href: "/invoices/expenses", active: !received },
            { key: "received", label: unpaid ? t("invoices.viewReceivedUnpaid", { n: unpaid }) : t("invoices.viewReceived"), href: "/invoices/expenses?view=received", active: received },
          ]}
        />
        <Expenses
          expenses={expenses}
          clients={lookups.clients.map((c) => ({ id: c.id, name: c.name }))}
          partners={partners}
          today={today()}
          monthLabels={monthLabels}
        />
      </div>
    </>
  );
}
