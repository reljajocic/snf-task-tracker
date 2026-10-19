import { redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { getBuyers, getInvoiceAccess, getIssuers, getPeople } from "@/lib/finance";
import { InvoiceForm } from "../InvoiceForm";

// URL: ?client=<id> starts the invoice for that client.
export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const [params, access] = await Promise.all([searchParams, getInvoiceAccess()]);
  if (!access.any) redirect("/");
  const [issuers, buyers, lookups, people] = await Promise.all([getIssuers(), getBuyers(), getLookups(), access.finance ? getPeople() : Promise.resolve([])]);
  const partners = people.filter((p) => p.is_partner);
  const others = people.filter((p) => !p.is_partner);
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
      others={others}
      shares={{}}
      finance={access.finance}
      today={today()}
      defaultClientId={defaultClientId}
    />
  );
}
