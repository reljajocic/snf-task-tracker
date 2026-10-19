import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBuyers, getInvoice, getInvoiceAccess, getIssuers } from "@/lib/finance";
import { INVOICE_TEXT as T, invoiceDate, invoiceFileName, invoiceNumber, money, rsd } from "@/lib/invoices";
import { PrintBar } from "./PrintBar";

// The invoice as a printable A4 page, laid out like the old Google Docs template.
// "Save as PDF" in the browser's print dialog makes the file (named after the number and buyer).

async function load(id: string) {
  const access = await getInvoiceAccess();
  if (!access.any) redirect("/");
  const [invoice, issuers, buyers] = await Promise.all([getInvoice(id), getIssuers(), getBuyers()]);
  if (!invoice) notFound();
  const issuer = { ...issuers.find((i) => i.id === invoice.issuer_id), ...invoice.issuer_snapshot };
  const buyer = { ...buyers.find((b) => b.id === invoice.buyer_id), ...invoice.buyer_snapshot };
  return { invoice, issuer, buyer };
}

export async function generateMetadata({ params }: PageProps<"/print/invoices/[id]">): Promise<Metadata> {
  const { invoice, buyer } = await load((await params).id);
  return { title: invoiceFileName(invoice, buyer.name ?? "") };
}

export default async function PrintInvoicePage({ params }: PageProps<"/print/invoices/[id]">) {
  const { id } = await params;
  const { invoice, issuer, buyer } = await load(id);
  const number = invoiceNumber(invoice);
  const rate = invoice.eur_rate;

  // Bold label, plain value (the buyer block and the issuer's numbers).
  const line = (label: string, value?: string | null, big = false) =>
    value ? (
      <p>
        <b>{label}:</b> <span className={big ? "text-[16px]" : undefined}>{value}</span>
      </p>
    ) : null;
  const cell = "border border-black px-[9px] align-middle";

  return (
    <div className="min-h-dvh bg-[#e9e7e1] print:bg-white">
      <style>{`@page { size: A4; margin: 0; } html, body { background: #fff !important; } .invoice { font-family: Arial, Helvetica, sans-serif; }`}</style>
      <PrintBar backHref={`/invoices/${invoice.id}`} />
      <article className="invoice mx-auto mb-10 flex min-h-[297mm] w-[210mm] flex-col bg-white px-[22mm] pb-[20mm] pt-[11mm] text-[14.5px] leading-[1.45] text-black shadow-[0_2px_24px_rgba(0,0,0,.12)] print:m-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          <img src="/brand/invoice-logo.png" alt="Slate n' Frame" className="mt-[1mm] size-[30mm] flex-none" />
          <div className="text-right text-[15px] leading-[1.6]">
            <p className="font-bold">{issuer.name}</p>
            <p>{issuer.address}</p>
            {issuer.mb && <p>{T.mb}: {issuer.mb}</p>}
            {issuer.pib && <p>{T.pib}: {issuer.pib}</p>}
            {issuer.account && <p>{T.account}: {issuer.account}</p>}
          </div>
        </header>

        <div className="mt-[14mm] grid grid-cols-2 gap-8">
          <div>
            <p>
              <b>{T.number}:</b> {number ?? "—"}
            </p>
            <p>
              {T.date}: {invoiceDate(invoice.issued_on)}
            </p>
            <p>{T.due(invoice.due_days)}</p>
            <p>
              {T.place}: {issuer.place}
            </p>
          </div>
          <div>
            {line(T.buyer, buyer.name, true)}
            {line(T.address, buyer.address)}
            {line(T.pib, buyer.pib)}
            {line(T.mb, buyer.mb)}
          </div>
        </div>

        <table className="mt-[20mm] w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-[#e8693b] text-white">
              {T.cols.map((c) => (
                <th key={c} className={`${cell} h-[17mm] text-[12.5px] font-normal uppercase leading-[1.15]`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[16px] leading-[1.2]">
            {invoice.items.map((it, i) => (
              <tr key={i} className="h-[19mm]">
                <td className={`${cell} text-[12.5px]`}>{i + 1}.</td>
                <td className={cell}>{it.description}</td>
                <td className={`${cell} pl-[7mm]`}>{it.quantity}</td>
                <td className={`${cell} tabular-nums`}>{money(rsd(it.price, invoice.currency, rate))}</td>
                <td className={cell}>RSD</td>
                <td className={`${cell} tabular-nums`}>{money(rsd(it.price * it.quantity, invoice.currency, rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-[11mm] text-right text-[15px] font-bold uppercase">
          {T.total}:&nbsp; {money(invoice.total_rsd)} RSD
        </p>

        <p className="mt-[11mm] text-[19px]">{T.signature}:</p>
        <p className="mt-[24mm] w-[52mm] border-t border-black" />

        <footer className="mt-[6mm] flex flex-col text-[12.5px] italic leading-[1.45]">
          {issuer.footer && <p>{issuer.footer}</p>}
          {invoice.currency === "EUR" && rate && (
            <p>
              {T.rate(invoiceDate(invoice.issued_on))} <b>{money(rate, 4)}</b>
            </p>
          )}
          {invoice.note && <p>{invoice.note}</p>}
        </footer>
      </article>
    </div>
  );
}
