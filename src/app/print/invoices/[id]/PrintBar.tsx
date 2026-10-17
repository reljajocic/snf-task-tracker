"use client";

import { useTranslations } from "next-intl";

/** Screen-only bar above the page: save as PDF (the browser's print dialog) or go back. */
export function PrintBar({ backHref }: { backHref: string }) {
  const t = useTranslations("invoices");
  return (
    <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-4 print:hidden">
      <a href={backHref} className="text-[14px] font-medium text-[#555] hover:text-black">‹ {t("backToInvoice")}</a>
      <button type="button" onClick={() => window.print()} className="h-10 cursor-pointer rounded-md bg-[#ea693a] px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1c1a1b]">
        {t("savePdf")}
      </button>
    </div>
  );
}
