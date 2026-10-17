"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { markPaid } from "./actions";

/** "Paid today" right from the list, for the common case. */
export function MarkPaid({ id, today }: { id: string; today: string }) {
  const t = useTranslations("invoices");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await markPaid(id, today);
          if (res.error) window.alert(res.error);
        });
      }}
      className="h-8 cursor-pointer whitespace-nowrap rounded-md border border-line2 px-2.5 text-[12px] font-semibold text-ink2 hover:border-ink3 hover:text-ink disabled:opacity-45"
    >
      {t("paidToday")}
    </button>
  );
}
