"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateTask } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { AssignPicker } from "./AssignPicker";
import { formatDate, formatShortDate, weekdayIndex, type IsoDate } from "@/lib/dates";
import { PHASES, itemStatus, postingStatus, type ItemStatus, type Task } from "@/lib/tasks";
import { PostTags } from "@/components/tasks/tags";
import { ShootMarker, type ScheduleShoot } from "./ShootMarker";
import { ScriptLabel } from "@/components/tasks/ScriptLabel";
import { ItemDates } from "@/components/tasks/item-bits";
import { TaskRow } from "@/components/tasks/rows";
import { StatusMenu } from "@/components/tasks/StatusMenu";
import { AvatarStack } from "@/components/ui/Avatar";

export type ScheduleWeek = {
  n: number;
  from: IsoDate;
  to: IsoDate;
  current: boolean;
  rows: { date: IsoDate; video: Task | null }[];
  /** The client's shoot days that week. */
  shoots?: ScheduleShoot[];
};

const GRID = "grid grid-cols-[140px_minmax(0,1fr)_150px_252px_84px] gap-x-4";

const stretched = "outline-none after:absolute after:inset-0 after:content-[''] focus-visible:shadow-none focus-visible:after:shadow-[inset_0_0_0_2px_var(--accent)]";

/** Under the title: the post's tags, who's on camera and where, kept apart by space. */
function Facts({ v }: { v: Task }) {
  const t = useTranslations();
  return (
    <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-ink2">
      <PostTags format={v.format} type={v.content_type} formatLabel={t(`format.${v.format}`)} />
      {v.on_camera && <span>{v.on_camera}</span>}
      {v.location && <span className="text-ink3">{v.location}</span>}
    </span>
  );
}

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
  const [open, setOpen] = useState<string | null>(null);
  const [type, setType] = useState("all");
  // The same statuses the rows show (the video's phase), plus "Not published": its date passed and it isn't out.
  const [status, setStatus] = useState<"all" | "not_published" | ItemStatus>("all");
  const [location, setLocation] = useState("all");
  const [, startTransition] = useTransition();

  const all = weeks.flatMap((w) => w.rows.map((r) => r.video)).filter((v): v is Task => v !== null);
  const types = [...new Set(all.map((v) => v.content_type).filter(Boolean))] as string[];
  const locations = [...new Set(all.map((v) => v.location).filter(Boolean))] as string[];
  const matches = (v: Task) =>
    (type === "all" || v.content_type === type) &&
    (status === "all" || (status === "not_published" ? postingStatus(v, today) === "not_published" : itemStatus(v) === status)) &&
    (location === "all" || v.location === location);
  const filtering = type !== "all" || status !== "all" || location !== "all";

  const assign = (videoId: string, date: IsoDate | null) =>
    startTransition(async () => {
      const claim = date && profile && !unscheduled.find((v) => v.id === videoId)?.profile;
      await updateTask(videoId, claim ? { publish_date: date, profile } : { publish_date: date });
    });

  const day = (d: IsoDate) => t("weekday.short", { day: String(weekdayIndex(d)) });
  const pill = "h-9 cursor-pointer appearance-none rounded-full border bg-transparent px-3 text-[13px] font-medium outline-none";
  const tone = (active: boolean) => (active ? "border-ink2 text-ink" : "border-line2 text-ink2");

  const assignSelect = (date: IsoDate) =>
    unscheduled.length > 0 && <AssignPicker videos={unscheduled} onPick={(id) => assign(id, date)} />;

  return (
    <div className="flex flex-col pb-[calc(120px+env(safe-area-inset-bottom))] lg:pb-12">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-5 pb-[18px] lg:px-10">
        {clientPicker}
        <span className="mx-1 hidden h-5 w-px bg-line2 sm:block" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`${pill} ${tone(status !== "all")}`}>
          <option value="all">{t("schedule.allStatuses")}</option>
          {([...PHASES, "published"] as const).map((s) => (
            <option key={s} value={s}>{t(`phase.${s}`)}</option>
          ))}
          <option value="not_published">{t("postingStatus.not_published")}</option>
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
        <div className="@container hidden lg:block">
          <div className={`${GRID} hidden px-4 pb-2.5 pt-3.5 text-[13px] font-medium leading-none text-ink3 @[960px]:grid`}>
            <span>{t("schedule.col.date")}</span>
            <span>{t("schedule.col.title")}</span>
            <span>{t("schedule.col.status")}</span>
            <span>{t("item.dates")}</span>
            <span className="justify-self-end">{t("item.people")}</span>
          </div>
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
                {w.shoots?.map((sh) => (
                  <span key={sh.id} className="self-center">
                    <ShootMarker shoot={sh} label={`${t("shoots.shootDay")} ${formatShortDate(sh.date)}`} />
                  </span>
                ))}
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
                      {/* Desktop row: posting day, then the usual order (title and where it belongs, status, dates,
                          people). The title opens the script under the row; the status changes in place. */}
                      <div className={`@container relative hidden hover:bg-hover lg:block ${s === "not_published" ? "bg-red-bg hover:bg-red-bg" : ""}`}>
                        <div className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-[13px] @[960px]:grid-cols-[140px_minmax(0,1fr)_150px_252px_84px]">
                          <span className="flex gap-2 whitespace-nowrap text-[14px] font-medium">
                            <span className="w-[30px] text-ink3">{day(r.date)}</span>
                            {formatDate(r.date)}
                          </span>
                          <span className="flex min-w-0 flex-col gap-1.5">
                            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : v.id)} className={`cursor-pointer text-left text-[15px] font-medium leading-snug ${stretched}`}>
                              {v.title}
                            </button>
                            <Facts v={v} />
                          </span>
                          <span className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-x-5 gap-y-2 @[960px]:contents">
                            <span className="relative justify-self-start">
                              <StatusMenu task={v} today={today} size="sm" />
                            </span>
                            <ItemDates task={v} today={today} />
                          </span>
                          <span className="col-start-3 row-start-1 justify-self-end @[960px]:col-start-5">
                            <AvatarStack people={v.assignees} size={28} />
                          </span>
                        </div>
                      </div>
                      {/* Phone card: the same pieces stacked. */}
                      <div className={`relative flex flex-col gap-2.5 px-4 py-3.5 lg:hidden ${s === "not_published" ? "bg-red-bg" : ""}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="whitespace-nowrap text-[13px] font-medium text-ink3">
                            {day(r.date)} {formatShortDate(r.date)}
                          </span>
                          <AvatarStack people={v.assignees} size={26} />
                        </div>
                        <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : v.id)} className={`cursor-pointer text-left text-[16px] font-medium leading-snug ${stretched}`}>
                          {v.title}
                        </button>
                        <Facts v={v} />
                        <span className="relative flex flex-wrap items-end gap-x-5 gap-y-2">
                          <StatusMenu task={v} today={today} size="sm" />
                          <ItemDates task={v} today={today} slots={false} />
                        </span>
                      </div>
                      {isOpen && (
                        <div className="flex flex-col gap-4 bg-chip px-4 pb-5 pt-2 lg:pl-[170px]">
                          {v.script.some((sec) => sec.text.trim()) ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                              {v.script.filter((sec) => sec.text.trim()).map((sec, j) => (
                                <div key={j} className="flex flex-col gap-2">
                                  <ScriptLabel label={sec.label} tight />
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
                <TaskRow key={v.id} task={v} today={today} inClient />
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
