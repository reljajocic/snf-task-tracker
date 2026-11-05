"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { DatePicker } from "@/components/tasks/DatePicker";
import { inputClass, selectClass } from "@/components/tasks/fields";
import { formatDate, type IsoDate } from "@/lib/dates";
import type { ClientReminder, ReminderRepeat } from "@/lib/reminders";
import { addClientReminder, deleteClientReminder } from "../actions";

/** The viewer's own reminders on this client ("Send invoice" on the 1st, every month); sent as push/email that morning. */
export function ClientReminders({ clientId, reminders, today }: { clientId: string; reminders: ClientReminder[]; today: IsoDate }) {
  const t = useTranslations("clients");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(t("reminderDefault"));
  const [remindOn, setRemindOn] = useState<IsoDate | null>(null);
  const [repeat, setRepeat] = useState<ReminderRepeat>("monthly");

  const add = () =>
    startTransition(async () => {
      if (!remindOn) return;
      const res = await addClientReminder(clientId, { title, remindOn, repeat });
      setError(res.error);
      if (!res.error) {
        setTitle(t("reminderDefault"));
        setRemindOn(null);
      }
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteClientReminder(clientId, id);
      setError(res.error);
    });

  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{t("reminders")}</h2>
      <div className="flex flex-col rounded-lg border border-line bg-surf px-4 py-1.5">
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{r.title}</span>
            {r.repeat === "monthly" && (
              <span className="rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-ink2">{t("monthly")}</span>
            )}
            <span className="whitespace-nowrap text-[13px] font-medium text-ink2">{formatDate(r.remind_on)}</span>
            <button type="button" disabled={pending} onClick={() => remove(r.id)} aria-label={t("removeReminder")} className="cursor-pointer text-[14px] text-ink3 hover:text-red-ink">
              ×
            </button>
          </div>
        ))}
        {!reminders.length && <p className="py-3 text-[14px] text-ink3">{t("noReminders")}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label={t("reminderWhat")} placeholder={t("reminderWhat")} className={inputClass} />
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker value={remindOn} today={today} onChange={setRemindOn} emptyLabel={t("reminderDate")} />
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)} aria-label={t("reminders")} className={selectClass}>
            <option value="monthly">{t("reminderMonthly")}</option>
            <option value="none">{t("reminderOnce")}</option>
          </select>
          <button
            type="button"
            disabled={!remindOn || !title.trim() || pending}
            onClick={add}
            className="ml-auto h-9 cursor-pointer rounded-md border border-line2 px-3 text-[13px] font-medium disabled:cursor-default disabled:opacity-45"
          >
            {t("addReminder")}
          </button>
        </div>
      </div>
      <p className="text-[13px] leading-snug text-ink3">{t("remindersHint")}</p>
      {error && <p role="alert" className="text-[13px] text-red-ink">{error}</p>}
    </section>
  );
}
