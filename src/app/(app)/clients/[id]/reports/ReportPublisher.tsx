"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { inputClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { ask } from "@/components/ui/Dialog";
import { formatDate } from "@/lib/dates";
import { saveReport } from "./actions";

/** The team's word for the month and the switch that shows the report to the client. */
export function ReportPublisher({ clientId, month, summary, publishedAt, canEdit }: { clientId: string; month: string; summary: string | null; publishedAt: string | null; canEdit: boolean }) {
  const t = useTranslations("report");
  const router = useRouter();
  const [text, setText] = useState(summary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const run = (publish: boolean | null) =>
    start(async () => {
      const res = await saveReport(clientId, month, text, publish);
      if (res.error) return setError(res.error);
      setError(null);
      setSaved(true);
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surf p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="display text-[18px] leading-[1.1]">{t("forClient")}</h2>
        <span className={`text-[13px] font-semibold ${publishedAt ? "text-[var(--status-done)]" : "text-ink3"}`}>
          {publishedAt ? t("publishedOn", { date: formatDate(publishedAt.slice(0, 10)) }) : t("notPublished")}
        </span>
      </div>
      <textarea
        value={text}
        disabled={!canEdit}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={4}
        placeholder={t("summaryPlaceholder")}
        className={`${inputClass} h-auto resize-y py-3 leading-relaxed`}
      />
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {error && <span role="alert" className="mr-auto text-[13px] text-red-ink">{error}</span>}
          {saved && !error && <span className="mr-auto text-[13px] text-[var(--status-done)]">{t("saved")}</span>}
          {publishedAt ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={async () => (await ask({ title: t("unpublishConfirm"), confirm: t("unpublish"), danger: true })) && run(false)}
                className="h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
              >
                {t("unpublish")}
              </button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(null)}>{t("saveSummary")}</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(null)}>{t("saveSummary")}</Button>
              <Button size="sm" disabled={pending} onClick={async () => (await ask({ title: t("publishConfirm"), body: t("publishBody"), confirm: t("publish") })) && run(true)}>
                {t("publish")}
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
