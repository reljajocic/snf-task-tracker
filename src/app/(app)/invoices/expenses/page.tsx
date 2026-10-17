import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getExpenses, getInvoiceAccess, getPartners } from "@/lib/finance";
import { InvoicesHeader } from "../parts";
import { Expenses } from "./Expenses";

export default async function ExpensesPage() {
  const access = await getInvoiceAccess();
  if (!access.finance) redirect("/invoices");
  const [expenses, lookups, partners, t] = await Promise.all([getExpenses(), getLookups(), getPartners(), getTranslations()]);
  const monthLabels = Object.fromEntries(
    [...new Set(expenses.map((e) => e.spent_on.slice(0, 7)))].map((m) => [m, `${t("month.name", { m: String(Number(m.slice(5))) })} ${m.slice(0, 4)}`]),
  );

  return (
    <>
      <InvoicesHeader access={access} active="expenses" />
      <div className="px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
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
