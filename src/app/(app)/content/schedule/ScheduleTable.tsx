"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateTask } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { AssignPicker } from "./AssignPicker";
import { formatDate, formatShortDate, weekdayIndex, type IsoDate } from "@/lib/dates";
import { POSTING_STATUS_COLOR, postingStatus, type PostingStatus, type Task } from "@/lib/tasks";

export type ScheduleWeek = {
  n: number;
  from: IsoDate;
  to: IsoDate;
  current: boolean;
  rows: { date: IsoDate; video: Task | null }[];
};

const GRID = "grid grid-cols-[140px_minmax(0,1fr)_64px_150px_110px_140px_80px] gap-3.5";

/** 2a: posting schedule as a table, grouped by week (desktop) / cards (mobile 2c). */
export function ScheduleTable({
  weeks,
  unscheduled,
  today,
  clientPicker,
  profile = null,
}: {
  weeks: ScheduleWeek[];
  unscheduled: Task[];
  today: IsoDate;
  clientPicker: React.ReactNode;
  /** The profile being planned: a video without one gets it when it is put on a date. */
  profile?: string | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState<"all" | PostingStatus>("all");
  const [location, setLocation] = useState("all");
  const [, startTransition] = useTransition();

  const all = weeks.flatMap((w) => w.rows.map((r) => r.video)).filter((v): v is Task => v !== null);
  const types = [...new Set(all.map((v) => v.content_type).filter(Boolean))] as string[];
  const locations = [...new Set(all.map((v) => v.location).filter(Boolean))] as string[];
  const matches = (v: Task) =>
    (type === "all" || v.content_type === type) &&
    (status === "all" || postingStatus(v, today) === status) &&
    (location === "all" || v.location === location);
  const filtering = type !== "all" || status !== "all" || location !== "all";

  const assign = (videoId: string, date: IsoDate | null) =>
    startTransition(async () => {
      const claim = date && profile && !unscheduled.find((v) => v.id === videoId)?.profile;
      await updateTask(videoId, claim ? { publish_date: date, profile } : { publish_date: date });
      router.refresh();
    });

  const day = (d: IsoDate) => t("weekday.short", { day: String(weekdayIndex(d)) });
  const pill = "h-9 cursor-pointer appearance-none rounded-full border bg-transparent px-3 text-[13px] font-medium outline-none";
  const tone = (active: boolean) => (active ? "border-ink2 text-ink" : "border-line2 text-ink2");

  const statusCell = (v: Task) => {
    const s = postingStatus(v, today);
    return (
      <span className={`flex items-center gap-2 whitespace-nowrap text-[13px] font-medium ${s === "not_published" ? "text-red-ink" : "text-ink2"}`}>
        <span className="size-2 flex-none rounded-full" style={{ background: POSTING_STATUS_COLOR[s] }} />
        {t(`postingStatus.${s}`)}
      </span>
    );
  };

  const assignSelect = (date: IsoDate) =>
    unscheduled.length > 0 && <AssignPicker videos={unscheduled} onPick={(id) => assign(id, date)} />;

  return (
    <div className="flex flex-col pb-[120px] lg:pb-12">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-5 pb-[18px] lg:px-10">
        {clientPicker}
        <span className="mx-1 hidden h-5 w-px bg-line2 sm:block" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`${pill} ${tone(status !== "all")}`}>
          <option value="all">{t("schedule.allStatuses")}</option>
          {(["to_shoot", "shot", "published", "not_published", "not_shot"] as const).map((s) => (
            <option key={s} value={s}>{t(`postingStatus.${s}`)}</option>
          ))}
        </select>
        {types.length > 0 && (
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${pill} ${tone(type !== "all")}`}>
            <option value="all">{t("schedule.allTypes")}</option>
            {types.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        )}
        {locations.length > 0 && (
          <select value={location} onChange={(e) => setLocation(e.target.value)} className={`${pill} ${tone(location !== "all")}`}>
            <option value="all">{t("schedule.allLocations")}</option>
            {locations.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        )}
      </div>

      <div className="px-5 lg:px-10">
        <div className={`${GRID} hidden px-4 pb-2.5 pt-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink3 lg:grid`}>
          <span>{t("schedule.col.date")}</span>
          <span>{t("schedule.col.title")}</span>
          <span>{t("schedule.col.type")}</span>
          <span>{t("schedule.col.onCamera")}</span>
          <span>{t("schedule.col.location")}</span>
          <span>{t("schedule.col.status")}</span>
          <span>{t("schedule.col.shot")}</span>
        </div>

        {weeks.length === 0 && <p className="py-12 text-center text-[15px] text-ink3">{t("schedule.empty")}</p>}

        {weeks.map((w) => {
          const rows = w.rows.filter((r) => (r.video ? matches(r.video) : !filtering));
          if (!rows.length) return null;
          return (
            <div key={w.from} className="flex flex-col">
              <div className="flex items-baseline gap-3 px-1 pb-2 pt-[22px] lg:px-4">
                <span className="display text-[15px] leading-none">{t("schedule.week", { n: w.n })}</span>
                <span className="whitespace-nowrap text-[13px] font-medium text-ink3">
                  {formatShortDate(w.from)} – {formatDate(w.to)}
                </span>
                {w.current && <span className="whitespace-nowrap text-[12px] font-semibold text-accent">{t("schedule.thisWeek")}</span>}
              </div>
              <div className="snf-stack">
                {rows.map((r, i) => {
                  const v = r.video;
                  if (!v) {
                    return (
                      <div key={`${r.date}-${i}`} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-line px-4 py-[13px] first:border-t-0 lg:grid-cols-[140px_minmax(0,1fr)_auto]">
                        <span className="flex gap-2 whitespace-nowrap text-[14px] font-medium text-ink3">
                          <span className="w-[30px]">{day(r.date)}</span>
                          {formatDate(r.date)}
                        </span>
                        <span className="text-[14px] text-ink3">{t("schedule.freeSlot")}</span>
                        {assignSelect(r.date)}
                      </div>
                    );
                  }
                  const isOpen = open === v.id;
                  const s = postingStatus(v, today);
                  return (
                    <div key={v.id} className="flex flex-col border-t border-line first:border-t-0">
                      {/* Desktop row */}
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : v.id)}
                        className={`${GRID} hidden cursor-pointer items-center px-4 py-[13px] text-left hover:bg-chip lg:grid ${s === "not_published" ? "bg-red-bg" : ""}`}
                      >
                        <span className="flex gap-2 whitespace-nowrap text-[14px] font-medium">
                          <span className="w-[30px] text-ink3">{day(r.date)}</span>
                          {formatDate(r.date)}
                        </span>
                        <span className="truncate text-[15px] font-medium leading-snug">{v.title}</span>
                        <span>
                          {v.content_type && (
                            <span className="rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em] text-ink2">{v.content_type}</span>
                          )}
                        </span>
                        <span className="truncate text-[14px] text-ink2">{v.on_camera ?? "—"}</span>
                        <span className="truncate text-[14px] text-ink2">{v.location ?? "—"}</span>
                        {statusCell(v)}
                        <span className="text-[13px] text-ink3">{v.shoot ? formatShortDate(v.shoot.date) : "—"}</span>
                      </button>
                      {/* Mobile card */}
                      <button type="button" onClick={() => setOpen(isOpen ? null : v.id)} className="flex cursor-pointer flex-col gap-2 px-4 py-3.5 text-left lg:hidden">
                        <div className="flex items-center justify-between gap-3">
                          <span className="whitespace-nowrap text-[13px] font-medium text-ink3">
                            {day(r.date)} {formatShortDate(r.date)}
                          </span>
                          {statusCell(v)}
                        </div>
                        <span className="text-[16px] font-medium leading-snug">{v.title}</span>
                        <span className="text-[13px] text-ink2">{[v.content_type, v.on_camera, v.location].filter(Boolean).join(" · ")}</span>
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-4 bg-chip px-4 pb-5 pt-2 lg:pl-[170px]">
                          {v.script.some((sec) => sec.text.trim()) ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                              {v.script.filter((sec) => sec.text.trim()).map((sec, j) => (
                                <div key={j} className="flex flex-col gap-2">
                                  <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent">{sec.label}</span>
                                  <span className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink2">{sec.text}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[14px] text-ink3">—</span>
                          )}
                          <div className="flex gap-4 text-[13px] font-medium">
                            <TaskLink id={v.id} className="text-rust-ink hover:underline">
                              {t("schedule.open")} ↗
                            </TaskLink>
                            {s !== "published" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    startTransition(async () => {
                                      await updateTask(v.id, { phase: 5 });
                                      router.refresh();
                                    })
                                  }
                                  className="cursor-pointer text-[var(--status-done)] hover:underline"
                                >
                                  {t("schedule.markPublished")}
                                </button>
                                <button type="button" onClick={() => assign(v.id, null)} className="cursor-pointer text-ink3 hover:text-ink">
                                  {t("schedule.unschedule")}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="flex flex-col gap-2 pt-9">
          <div className="flex items-baseline gap-3 px-1 pb-1 lg:px-4">
            <span className="display text-[15px] leading-none">{t("schedule.unscheduled")}</span>
            <span className="text-[13px] font-medium text-ink3">{unscheduled.length}</span>
          </div>
          {unscheduled.length ? (
            <div className="snf-stack">
              {unscheduled.map((v) => (
                <TaskLink key={v.id} id={v.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 border-t border-line px-4 py-[13px] first:border-t-0 hover:bg-chip lg:grid-cols-[minmax(0,1fr)_64px_150px_110px_140px]">
                  <span className="truncate text-[15px] font-medium">{v.title}</span>
                  <span className="hidden lg:block">
                    {v.content_type && <span className="rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em] text-ink2">{v.content_type}</span>}
                  </span>
                  <span className="hidden truncate text-[14px] text-ink2 lg:block">{v.on_camera ?? "—"}</span>
                  <span className="hidden truncate text-[14px] text-ink2 lg:block">{v.location ?? "—"}</span>
                  {statusCell(v)}
                </TaskLink>
              ))}
            </div>
          ) : (
            <p className="px-1 text-[14px] text-ink3 lg:px-4">{t("schedule.noVideos")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
