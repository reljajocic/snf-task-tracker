import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { getLookups } from "@/lib/data";
import { formatDate, today as getToday } from "@/lib/dates";
import { getInvoiceAccess, getInvoiceDocument, getPeople, getShares } from "@/lib/finance";
import { invoiceNumber, money, payState } from "@/lib/invoices";
import { safeHref } from "@/lib/safe-url";
import { MarkPaid } from "../MarkPaid";
import { PayBadge } from "../parts";
import { PageTitle } from "@/components/shell/PageTitle";

// One invoice to look at: the document itself (as it prints) and, beside it, where it stands: paid or not,
// when it's due, who it's for, how the money splits. Changing it is a separate step (Edit).
export default async function InvoiceView({ params }: PageProps<"/invoices/[id]">) {
  const [{ id }, access] = await Promise.all([params, getInvoiceAccess()]);
  if (!access.any) redirect("/");
  const doc = await getInvoiceDocument(id);
  if (!doc) notFound();
  const { invoice, issuer, buyer, signature } = doc;
  // A draft has nothing to look at yet: it's still being written.
  if (invoice.status === "draft") redirect(`/invoices/${id}/edit`);

  const [t, lookups, shares, people] = await Promise.all([
    getTranslations("invoices"),
    getLookups(),
    access.finance ? getShares(id) : Promise.resolve([]),
    access.finance ? getPeople() : Promise.resolve([]),
  ]);
  const today = getToday();
  const pay = payState(invoice, today);
  const client = lookups.clients.find((c) => c.id === invoice.client_id);
  const number = invoiceNumber(invoice);

  const fact = (label: string, value: React.ReactNode) =>
    value ? (
      <div className="flex justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
        <span className="text-[14px] text-ink3">{label}</span>
        <span className="text-right text-[14px] font-medium">{value}</span>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <PageTitle
        back={{ href: "/invoices", label: t("title") }}
        title={t("numbered", { number: number ?? "" })}
        sub={<PayBadge state={pay.state} daysLate={pay.daysLate} />}
        actions={
          <>
            {(pay.state === "waiting" || pay.state === "overdue") && <MarkPaid id={invoice.id} today={today} />}
            <Link href={`/print/invoices/${invoice.id}`} target="_blank" className={buttonClass({ size: "sm", variant: "secondary" })}>
              {t("pdf")}
            </Link>
            <Link href={`/invoices/${invoice.id}/edit`} className={buttonClass({ size: "sm" })}>
              {t("edit")}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[auto_minmax(300px,420px)]">
        {/* The document, scaled to fit: 210 mm wide is ~794 px. */}
        <div className="overflow-hidden rounded-lg border border-line bg-[#e9e7e1] p-3 sm:p-5">
          <InvoiceDocument invoice={invoice} issuer={issuer} buyer={buyer} signature={signature} className="mx-auto shadow-[0_2px_16px_rgba(0,0,0,.12)] [zoom:0.38] sm:[zoom:0.72] lg:[zoom:0.8]" />
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-line bg-surf px-5 py-3">
            {fact(t("total"), `${money(invoice.total_rsd)} RSD`)}
            {fact(t("buyer"), buyer.name)}
            {fact(t("client"), client && <Link href={`/clients/${client.id}`} className="hover:underline">{client.name}</Link>)}
            {fact(t("issuedOn"), formatDate(invoice.issued_on))}
            {fact(t("dueOn"), formatDate(pay.due))}
            {fact(t("paidOn"), invoice.paid_on ? formatDate(invoice.paid_on) : "—")}
            {fact(
              t("pdfOnDrive"),
              invoice.pdf_url && (
                <a href={safeHref(invoice.pdf_url)} target="_blank" rel="noreferrer" className="text-rust-ink hover:underline">
                  {t("open")} ↗
                </a>
              ),
            )}
            {fact(t("note"), invoice.note)}
          </section>

          {access.finance && (
            <section className="flex flex-col gap-2.5">
              <h2 className="eyebrow">{t("split")}</h2>
              <div className="rounded-lg border border-line bg-surf px-5 py-2">
                {shares.length ? (
                  shares.map((s) => {
                    const p = people.find((x) => x.id === s.profile_id);
                    return (
                      <div key={s.profile_id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                        {p && <Avatar person={p} size={26} />}
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p?.full_name ?? "—"}</span>
                        <span className="text-[14px] font-semibold tabular-nums">{money(s.amount)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-2.5 text-[14px] text-ink3">{t("splitEmpty")}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
