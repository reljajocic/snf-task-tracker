"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { reportBrowserError } from "@/app/actions/report-error";

/** What people see when a page breaks: a calm message and "try again"; the admin gets told. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    // The page was loaded before a new version went live, so its buttons point at code that's gone.
    // Loading the page again fixes it; do that once (per minute) instead of showing an error.
    if (/server action|older or newer deployment|failed to fetch dynamically imported module|loading chunk/i.test(error.message ?? "")) {
      let last = 0;
      try {
        last = Number(sessionStorage.getItem("snf-stale-reload") ?? 0);
        sessionStorage.setItem("snf-stale-reload", String(Date.now()));
      } catch {}
      if (Date.now() - last > 60_000) {
        window.location.reload();
        return;
      }
    }
    void reportBrowserError(error.message || "Unknown error", error.digest ?? null, window.location.pathname + window.location.search);
  }, [error]);
  return (
    <div className="flex flex-1 flex-col items-start gap-4 px-5 py-16 lg:px-10">
      <h1 className="display text-[30px] lg:text-[32px]">{t("errorTitle")}</h1>
      <p className="max-w-[520px] text-[15px] leading-relaxed text-ink2">{t("errorText")}</p>
      <button type="button" onClick={() => (navigator.onLine ? window.location.reload() : reset())} className="h-11 cursor-pointer rounded-md bg-accent px-5 text-[14px] font-semibold text-charcoal">
        {t("tryAgain")}
      </button>
    </div>
  );
}
