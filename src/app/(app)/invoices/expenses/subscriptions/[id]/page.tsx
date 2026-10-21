import { notFound, redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getInvoiceAccess, getPartners, getSubscriptions } from "@/lib/finance";
import { SubscriptionForm } from "../../SubscriptionForm";

export default async function SubscriptionPage({ params }: PageProps<"/invoices/expenses/subscriptions/[id]">) {
  const [{ id }, access] = await Promise.all([params, getInvoiceAccess()]);
  if (!access.finance) redirect("/invoices");
  const [subs, lookups, partners] = await Promise.all([getSubscriptions(), getLookups(), getPartners()]);
  const sub = subs.find((s) => s.id === id);
  if (!sub) notFound();
  return (
    <div className="px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <SubscriptionForm sub={sub} clients={lookups.clients.map((c) => ({ id: c.id, name: c.name }))} partners={partners} today={today()} />
    </div>
  );
}
