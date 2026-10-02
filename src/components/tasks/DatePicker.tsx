"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { addDays, formatDate, startOfWeek, weekdayIndex, type IsoDate } from "@/lib/dates";
import { Pill } from "./bits";

/** Today, tomorrow, next Monday, +7 days — the design's quick deadlines. */
export function quickDates(today: IsoDate) {
  const toMonday = 7 - weekdayIndex(today);
  return [
    { key: "today", date: today },
    { key: "tomorrow", date: addDays(today, 1) },
    { key: "monday", date: addDays(today, toMonday) },
    { key: "week", date: addDays(today, 7) },
  ] as const;
}

function monthGrid(month: IsoDate): IsoDate[] {
  // 6 rows × 7 days, starting on the Monday on/before the 1st.
  const first = `${month.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function shiftMonth(month: IsoDate, delta: number): IsoDate {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

export function MonthGrid({
  value,
  today,
  onPick,
}: {
  value: IsoDate | null;
  today: IsoDate;
  onPick: (d: IsoDate) => void;
}) {
  const t = useTranslations();
  const [month, setMonth] = useState<IsoDate>(`${(value ?? today).slice(0, 7)}-01`);
  const cells = monthGrid(month);
  const inMonth = (d: IsoDate) => d.slice(0, 7) === month.slice(0, 7);
  // Drop a trailing week that's entirely next month.
  const visible = inMonth(cells[35]) ? cells : cells.slice(0, 35);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="display text-[14px] leading-none">
          {t("month.name", { m: String(Number(month.slice(5, 7))) })} {month.slice(0, 4)}
        </span>
        <span className="flex gap-0.5 text-[16px] text-ink3">
          <button type="button" aria-label={t("calendar.prev")} onClick={() => setMonth(shiftMonth(month, -1))} className="grid size-7 cursor-pointer place-items-center hover:text-ink">‹</button>
          <button type="button" aria-label={t("calendar.next")} onClick={() => setMonth(shiftMonth(month, 1))} className="grid size-7 cursor-pointer place-items-center hover:text-ink">›</button>
        </span>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-ink3">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <span key={d}>{t("weekday.narrow", { day: String(d) })}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {visible.map((d) => {
          const selected = d === value;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={`h-9 cursor-pointer rounded-full border p-0 text-[13px] font-medium ${
                selected
                  ? "border-accent bg-accent text-charcoal"
                  : isToday
                    ? "border-accent text-accent"
                    : `border-transparent hover:bg-chip ${inMonth(d) ? "text-ink" : "text-ink3"}`
              }`}
            >
              {Number(d.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "05.10.2026 ▾" button with a popover calendar and quick picks (design 3a). */
export function DatePicker({
  value,
  today,
  onChange,
  disabled,
  emptyLabel,
}: {
  value: IsoDate | null;
  today: IsoDate;
  onChange: (d: IsoDate | null) => void;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const t = useTranslations("task");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (d: IsoDate | null) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="h-[34px] cursor-pointer whitespace-nowrap rounded-md border border-line2 px-3 text-[14px] font-semibold text-ink disabled:cursor-default"
      >
        {value ? formatDate(value) : (emptyLabel ?? t("noDue"))} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-[42px] z-20 flex w-[300px] flex-col gap-2.5 rounded-lg border border-line2 bg-surf p-3.5 shadow-[var(--shadow-overlay)]">
          <MonthGrid value={value} today={today} onPick={pick} />
          <div className="flex flex-wrap gap-1.5 border-t border-line pt-2.5">
            {quickDates(today).map((q) => (
              <Pill key={q.key} size="sm" selected={value === q.date} onClick={() => pick(q.date)}>
                {t(`quick.${q.key}`)}
              </Pill>
            ))}
            {value && (
              <Pill size="sm" selected={false} onClick={() => pick(null)}>
                {t("quick.clear")}
              </Pill>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
