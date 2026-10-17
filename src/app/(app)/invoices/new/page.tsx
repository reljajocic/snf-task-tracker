import { redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getBuyers, getInvoiceAccess, getIssuers, getPartners } from "@/lib/finance";
import { InvoiceForm } from "../InvoiceForm";

// URL: ?client=<id> starts the invoice for that client.
export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const [params, access] = await Promise.all([searchParams, getInvoiceAccess()]);
  if (!access.any) redirect("/");
  const [issuers, buyers, lookups, partners] = await Promise.all([getIssuers(), getBuyers(), getLookups(), access.finance ? getPartners() : Promise.resolve([])]);
  const clients = lookups.clients.filter((c) => access.finance || access.clientIds.includes(c.id)).map((c) => ({ id: c.id, name: c.name }));
  const wanted = typeof params.client === "string" ? params.client : null;
  const defaultClientId = clients.some((c) => c.id === wanted) ? wanted : access.finance ? null : (clients[0]?.id ?? null);

  return (
    <InvoiceForm
      invoice={null}
      issuers={issuers}
      buyers={buyers}
      clients={clients}
      partners={partners}
      shares={{}}
      finance={access.finance}
      today={today()}
      defaultClientId={defaultClientId}
    />
  );
}
