"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { importShootSheet, type ShootFormState } from "./actions";

/** "Import from Google Sheets": paste the shoot sheet link, get a shoot day with all its videos. */
export function ImportSheet({ clients }: { clients: { id: string; name: string }[] }) {
  const t = useTranslations("shoots.import");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ShootFormState, FormData>(importShootSheet, null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 cursor-pointer items-center rounded-[4px] border border-line2 px-4 text-[13px] font-medium uppercase tracking-[0.14em]">
        {t("button")}
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-lg border border-line2 bg-surf p-4 lg:w-[560px]">
      <span className="display text-[15px]">{t("title")}</span>
      <span className="text-[13px] leading-snug text-ink3">{t("hint")}</span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
        <select name="client_id" className={`${selectClass} h-[42px]`}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="url" required placeholder="https://docs.google.com/spreadsheets/d/…" className={inputClass} />
      </div>
      <input name="location" placeholder={t("location")} className={inputClass} />
      {state?.error && <span role="alert" className="text-[13px] text-red-ink">{state.error}</span>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-10 cursor-pointer px-3 text-[14px] text-ink2">
          {t("cancel")}
        </button>
        <Button type="submit" size="sm" disabled={pending}>{pending ? t("importing") : t("import")}</Button>
      </div>
    </form>
  );
}
