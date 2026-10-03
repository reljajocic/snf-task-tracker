"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { updateTask } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { addDays, formatDate, isoWeek, startOfWeek, weekdayIndex, type IsoDate } from "@/lib/dates";
import { POSTING_STATUS_COLOR, postingStatus, type Task } from "@/lib/tasks";

/** 2b: month grid of posts; drag a video from "Shot, no date" (or another day) onto a day. */
export function ScheduleCalendar({
  month,
  videos,
  unscheduled,
  postingDays,
  today,
  profile = null,
}: {
  month: IsoDate;
  videos: Task[];
  unscheduled: Task[];
  postingDays: number[];
  today: IsoDate;
  /** The profile being planned: a video without one gets it when it is put on a date. */
  profile?: string | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [over, setOver] = useState<IsoDate | null>(null);
  const [picked, setPicked] = useState<IsoDate>(today.slice(0, 7) === month.slice(0, 7) ? today : month);
  const [items, move] = useOptimistic(videos, (cur, { id, date }: { id: string; date: IsoDate | null }) =>
    cur.map((v) => (v.id === id ? { ...v, publish_date: date } : v)),
  );

  const first = month;
  const lastDay = addDays(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10), -1);
  const start = startOfWeek(first);
  const weeks = Math.ceil((weekdayIndex(first) + Number(lastDay.slice(8, 10))) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const on = (d: IsoDate) => items.filter((v) => v.publish_date === d);
  const pool = items.filter((v) => !v.publish_date && (v.phase ?? 0) < 5 && unscheduled.some((u) => u.id === v.id));

  const drop = (date: IsoDate | null) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/video-id");
    if (!id) return;
    startTransition(async () => {
      move({ id, date });
      const claim = date && profile && ![...videos, ...unscheduled].find((v) => v.id === id)?.profile;
      await updateTask(id, claim ? { publish_date: date, profile } : { publish_date: date });
      router.refresh();
    });
  };
  const drag = (id: string) => (e: DragEvent) => {
    e.dataTransfer.setData("text/video-id", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const chip = (v: Task) => {
    const s = postingStatus(v, today);
    return (
      <TaskLink
        key={v.id}
        id={v.id}
        draggable
        onDragStart={drag(v.id)}
        className={`flex cursor-grab flex-col gap-1 rounded-[5px] border px-2 py-1.5 active:cursor-grabbing ${s === "not_published" ? "border-red-line bg-red-bg" : "border-line bg-surf"}`}
      >
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase leading-none tracking-[0.08em] text-ink3">
          <span className="size-[7px] flex-none rounded-full" style={{ background: POSTING_STATUS_COLOR[s] }} />
          {v.content_type}
        </span>
        <span className="line-clamp-2 text-[12px] font-medium leading-tight">{v.title}</span>
        {v.on_camera && <span className="truncate text-[11px] text-ink3">{v.on_camera}</span>}
      </TaskLink>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 px-5 pb-[120px] pt-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-10 lg:pb-10">
      <div className="flex flex-col">
        <div className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] pb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink3">
          <span />
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <span key={d} className="pl-2">{t("weekday.short", { day: String(d) })}</span>
          ))}
        </div>
        <div className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] border-l border-t border-line">
          {cells.map((d, i) => {
            const inMonth = d.slice(0, 7) === month.slice(0, 7);
            const list = on(d);
            const isPostingDay = postingDays.includes(weekdayIndex(d));
            return (
              <div key={d} className="contents">
                {i % 7 === 0 && (
                  <span className="border-b border-r border-line pt-2 text-center text-[10.5px] font-semibold text-ink3">
                    {t("calendar.weekShort", { n: isoWeek(d) })}
                  </span>
                )}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(d);
                  }}
                  onDragLeave={() => setOver((o) => (o === d ? null : o))}
                  onDrop={drop(d)}
                  onClick={() => setPicked(d)}
                  className={`flex min-h-[64px] flex-col gap-1 border-b border-r border-line p-1.5 lg:min-h-[120px] ${
                    over === d ? "bg-rust-bg" : isPostingDay && inMonth ? "bg-chip" : ""
                  } ${picked === d ? "max-lg:ring-1 max-lg:ring-inset max-lg:ring-ink2" : ""}`}
                >
                  <span
                    className={`grid size-6 flex-none place-items-center rounded-full text-[12px] font-semibold ${
                      d === today ? "bg-accent text-charcoal" : inMonth ? "text-ink" : "text-ink3"
                    }`}
                  >
                    {Number(d.slice(8, 10))}
                  </span>
                  <div className="hidden flex-col gap-1 lg:flex">{list.map(chip)}</div>
                  <div className="flex gap-0.5 lg:hidden">
                    {list.map((v) => (
                      <span key={v.id} className="size-1.5 rounded-full" style={{ background: POSTING_STATUS_COLOR[postingStatus(v, today)] }} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: list for the tapped day */}
        <div className="flex flex-col gap-2 pt-4 lg:hidden">
          <span className="display text-[16px]">
            {t("weekday.long", { day: String(weekdayIndex(picked)) })}, {formatDate(picked)}
          </span>
          {on(picked).length ? on(picked).map(chip) : <span className="text-[14px] text-ink3">{t("schedule.freeSlot")}</span>}
        </div>
      </div>

      <aside
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop(null)}
        className="flex flex-col gap-2.5 self-start rounded-lg border border-line bg-surf p-3.5"
      >
        <div className="flex items-baseline gap-2">
          <span className="display text-[15px] leading-none">{t("schedule.unscheduled")}</span>
          <span className="text-[13px] font-medium text-ink3">{pool.length}</span>
        </div>
        <span className="text-[12.5px] leading-snug text-ink3">{t("schedule.unscheduledHint")}</span>
        {pool.map(chip)}
        {!pool.length && <span className="text-[13px] text-ink3">{t("schedule.noVideos")}</span>}
      </aside>
    </div>
  );
}
