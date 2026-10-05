"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { reportBrowserError } from "@/app/actions/report-error";

/** What people see when a page breaks: a calm message and "try again"; the admin gets told. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    void reportBrowserError(error.message || "Unknown error", error.digest ?? null, window.location.pathname + window.location.search);
  }, [error]);
  return (
    <div className="flex flex-1 flex-col items-start gap-4 px-5 py-16 lg:px-10">
      <h1 className="display text-[28px] lg:text-[36px]">{t("errorTitle")}</h1>
      <p className="max-w-[520px] text-[15px] leading-relaxed text-ink2">{t("errorText")}</p>
      <button type="button" onClick={reset} className="h-11 cursor-pointer rounded-md bg-accent px-5 text-[14px] font-semibold text-charcoal">
        {t("tryAgain")}
      </button>
    </div>
  );
}
