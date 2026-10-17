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

  const line = (label: string, value?: string | null) =>
    value ? (
      <p>
        <b>{label}:</b> {value}
      </p>
    ) : null;

  return (
    <div className="min-h-dvh bg-[#e9e7e1] print:bg-white">
      <style>{`@page { size: A4; margin: 18mm 16mm; } html, body { background: #fff !important; }`}</style>
      <PrintBar backHref={`/invoices/${invoice.id}`} />
      <article className="mx-auto mb-10 flex min-h-[297mm] max-w-[210mm] flex-col gap-8 bg-white px-[16mm] py-[18mm] text-[13px] leading-[1.55] text-black shadow-[0_2px_24px_rgba(0,0,0,.12)] print:m-0 print:min-h-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[15px] font-bold">{issuer.name}</p>
            <p>{issuer.address}</p>
            {line(T.mb, issuer.mb)}
            {line(T.pib, issuer.pib)}
            {line(T.account, issuer.account)}
          </div>
          <img src="/brand/logo-off-white.png" alt="Slate n' Frame" className="h-[22px] invert" />
        </header>

        <div>
          <p className="text-[15px]">
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
          <p>
            <b>{T.buyer}:</b> {buyer.name}
          </p>
          {line(T.address, buyer.address)}
          {line(T.pib, buyer.pib)}
          {line(T.mb, buyer.mb)}
        </div>

        <table className="w-full border-collapse text-center text-[12px]">
          <thead>
            <tr>
              {T.cols.map((c) => (
                <th key={c} className="border border-black px-2 py-1.5 font-bold uppercase">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1.5">{i + 1}.</td>
                <td className="border border-black px-2 py-1.5 text-left">{it.description}</td>
                <td className="border border-black px-2 py-1.5">{it.quantity}</td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">{money(rsd(it.price, invoice.currency, rate))}</td>
                <td className="border border-black px-2 py-1.5">RSD</td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">{money(rsd(it.price * it.quantity, invoice.currency, rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-right text-[15px]">
          <b>
            {T.total}: {money(invoice.total_rsd)} RSD
          </b>
        </p>

        <div className="mt-6">
          <p>{T.signature}:</p>
          <p className="mt-10 w-56 border-t border-black" />
        </div>

        <footer className="mt-auto flex flex-col gap-0.5 text-[12px] italic">
          {issuer.footer && <p>{issuer.footer}</p>}
          {invoice.currency === "EUR" && rate && <p>{T.rate(invoiceDate(invoice.issued_on), money(rate, 4))}</p>}
          {invoice.note && <p>{invoice.note}</p>}
        </footer>
      </article>
    </div>
  );
}
