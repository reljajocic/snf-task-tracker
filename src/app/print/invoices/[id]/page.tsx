import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getInvoiceAccess, getInvoiceDocument } from "@/lib/finance";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import { invoiceFileName } from "@/lib/invoices";
import { PrintBar } from "./PrintBar";

// The invoice as a printable A4 page, laid out like the old Google Docs template.
// "Download PDF" makes the file (named after the number and buyer); printing is still there on computers.

async function load(id: string) {
  const access = await getInvoiceAccess();
  if (!access.any) redirect("/");
  const doc = await getInvoiceDocument(id);
  if (!doc) notFound();
  return doc;
}

export async function generateMetadata({ params }: PageProps<"/print/invoices/[id]">): Promise<Metadata> {
  const { invoice, buyer } = await load((await params).id);
  return { title: invoiceFileName(invoice, buyer.name ?? "") };
}

export default async function PrintInvoicePage({ params }: PageProps<"/print/invoices/[id]">) {
  const { id } = await params;
  const { invoice, issuer, buyer, signature } = await load(id);

  return (
    <div className="min-h-dvh bg-[#e9e7e1] print:bg-white">
      <style>{`@page { size: A4; margin: 0; } html, body { background: #fff !important; }`}</style>
      <PrintBar backHref={`/invoices/${invoice.id}`} fileName={invoiceFileName(invoice, buyer.name ?? "")} />
      {/* Phones see the whole page zoomed out to their width (A4 is ~794 px); print and the PDF are full size. */}
      <div id="invoice-fit" className="max-sm:[zoom:0.46] print:[zoom:1]">
        <InvoiceDocument id="invoice-page" invoice={invoice} issuer={issuer} buyer={buyer} signature={signature} className="mx-auto mb-10 shadow-[0_2px_24px_rgba(0,0,0,.12)] print:m-0 print:shadow-none" />
      </div>
    </div>
  );
}
