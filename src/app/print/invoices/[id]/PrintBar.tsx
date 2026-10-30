"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Screen-only bar above the page. "Download PDF" makes the file in the browser (an A4 page drawn from the
 * invoice below) and saves it under the invoice's name: one tap, phones included, where the print dialog
 * hid "Save as PDF" behind a share sheet. Printing stays a second button.
 */
export function PrintBar({ backHref, fileName }: { backHref: string; fileName: string }) {
  const t = useTranslations("invoices");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const page = document.getElementById("invoice-page");
    if (!page) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      // Drawn at full A4 size whatever the screen (the phone preview is zoomed out), 3× for sharp text.
      const canvas = await html2canvas(page, {
        scale: 3,
        backgroundColor: "#ffffff",
        windowWidth: 1000,
        onclone: (doc) => {
          const fit = doc.getElementById("invoice-fit");
          if (fit) fit.style.zoom = "1";
        },
      });
      const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const height = Math.min(297, (canvas.height / canvas.width) * 210);
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, height);
      pdf.setProperties({ title: fileName });
      pdf.save(`${fileName}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-4 print:hidden">
      <a href={backHref} className="text-[14px] font-medium text-[#555] hover:text-black">‹ {t("backToInvoice")}</a>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => window.print()} className="hidden h-10 cursor-pointer rounded-md border border-[#1c1a1b]/30 px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1c1a1b] sm:block">
          {t("print")}
        </button>
        <button type="button" disabled={busy} onClick={download} className="h-10 cursor-pointer rounded-md bg-[#ea693a] px-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1c1a1b] disabled:opacity-60">
          {busy ? t("makingPdf") : t("savePdf")}
        </button>
      </div>
    </div>
  );
}
