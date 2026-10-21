import { redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getInvoiceAccess, getPartners } from "@/lib/finance";
import { SubscriptionForm } from "../../SubscriptionForm";

export default async function NewSubscriptionPage() {
  if (!(await getInvoiceAccess()).finance) redirect("/invoices");
  const [lookups, partners] = await Promise.all([getLookups(), getPartners()]);
  return (
    <div className="px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <SubscriptionForm sub={null} clients={lookups.clients.map((c) => ({ id: c.id, name: c.name }))} partners={partners} today={today()} />
    </div>
  );
}
