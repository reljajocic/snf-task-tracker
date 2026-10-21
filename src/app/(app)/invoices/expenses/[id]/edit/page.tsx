import { notFound, redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getExpense, getInvoiceAccess, getPartners } from "@/lib/finance";
import { ExpenseForm } from "../../ExpenseForm";

export default async function EditExpensePage({ params }: PageProps<"/invoices/expenses/[id]/edit">) {
  const [{ id }, access] = await Promise.all([params, getInvoiceAccess()]);
  if (!access.finance) redirect("/invoices");
  const [expense, lookups, partners] = await Promise.all([getExpense(id), getLookups(), getPartners()]);
  if (!expense) notFound();
  return (
    <div className="px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <ExpenseForm expense={expense} clients={lookups.clients.map((c) => ({ id: c.id, name: c.name }))} partners={partners} today={today()} />
    </div>
  );
}
