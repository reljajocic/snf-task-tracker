import { notFound, redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getBuyers, getInvoice, getInvoiceAccess, getIssuers, getPartners, getShares } from "@/lib/finance";
import { InvoiceForm } from "../InvoiceForm";

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const [{ id }, access] = await Promise.all([params, getInvoiceAccess()]);
  if (!access.any) redirect("/");
  const [invoice, issuers, buyers, lookups, partners, shares] = await Promise.all([
    getInvoice(id),
    getIssuers(),
    getBuyers(),
    getLookups(),
    access.finance ? getPartners() : Promise.resolve([]),
    access.finance ? getShares(id) : Promise.resolve([]),
  ]);
  if (!invoice) notFound();
  const clients = lookups.clients.filter((c) => access.finance || access.clientIds.includes(c.id)).map((c) => ({ id: c.id, name: c.name }));

  return (
    <InvoiceForm
      key={invoice.id}
      invoice={invoice}
      issuers={issuers}
      buyers={buyers}
      clients={clients}
      partners={partners}
      shares={Object.fromEntries(shares.map((s) => [s.profile_id, s.amount]))}
      finance={access.finance}
      today={today()}
      defaultClientId={invoice.client_id}
    />
  );
}
