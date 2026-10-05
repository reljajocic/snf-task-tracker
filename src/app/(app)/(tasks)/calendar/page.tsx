import { ShootEvent } from "@/components/tasks/ShootEvent";
import { getShootDays } from "@/lib/content";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { PriorityMark, dueTone } from "@/components/tasks/bits";
import { TaskLink } from "@/components/tasks/links";
import { TaskCardMobile } from "@/components/tasks/rows";
import { AvatarStack } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { getTasks } from "@/lib/data";
import { addDays, formatDate, formatShortDate, isoWeek, startOfWeek, today as getToday, weekdayIndex, type IsoDate } from "@/lib/dates";
import { PRIORITY_COLOR, byDue, type Task } from "@/lib/tasks";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function monthStart(d: IsoDate) {
  return `${d.slice(0, 7)}-01`;
}
function shiftMonth(d: IsoDate, delta: number): IsoDate {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

// 5c / 5d. URL: ?view=month|week&d=<anchor>&day=<selected day (mobile list)>
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const [params, tasks, t, shoots] = await Promise.all([searchParams, getTasks({ includeDone: true }), getTranslations(), getShootDays()]);
  const today = getToday();
  const view = params.view === "week" ? "week" : "month";
  const anchor = typeof params.d === "string" && DATE_RE.test(params.d) ? params.d : today;
  const selected = typeof params.day === "string" && DATE_RE.test(params.day) ? params.day : anchor;

  const byDay = new Map<IsoDate, Task[]>();
  for (const x of tasks) {
    if (!x.due_date) continue;
    byDay.set(x.due_date, [...(byDay.get(x.due_date) ?? []), x]);
  }
  for (const list of byDay.values()) list.sort(byDue);
  const on = (d: IsoDate) => byDay.get(d) ?? [];
  // Shoot days sit on the calendar with the tasks (they're work too).
  const shootsOn = (d: IsoDate) => shoots.filter((s) => s.date === d);
  const shootLabel = t("shoots.shootDay");

  // Month grid: Monday on/before the 1st, through the Sunday on/after the last day.
  const first = monthStart(anchor);
  const gridStart = startOfWeek(first);
  const nextMonth = shiftMonth(first, 1);
  const weeks = Math.ceil((weekdayIndex(first) + (Number(addDays(nextMonth, -1).slice(8, 10)))) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged = { view, d: anchor, day: typeof params.day === "string" ? params.day : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "view" && v === "month")) next.set(k, v);
    const qs = next.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  };
  const prev = view === "month" ? shiftMonth(first, -1) : addDays(weekStart, -7);
  const next = view === "month" ? nextMonth : addDays(weekStart, 7);
  const period =
    view === "month"
      ? `${t("month.name", { m: String(Number(first.slice(5, 7))) })} ${first.slice(0, 4)}`
      : t("calendar.weekRange", { from: formatShortDate(weekStart), to: formatDate(addDays(weekStart, 6)) });

  const seg = [
    { key: "month", label: t("calendar.month"), href: href({ view: "month" }), active: view === "month" },
    { key: "week", label: t("calendar.week"), href: href({ view: "week" }), active: view === "week" },
  ];

  const navControls = (
    <>
      <div className="flex h-[42px] items-center whitespace-nowrap rounded-[7px] border border-line2 text-[14px] font-medium">
        <Link href={href({ d: prev, day: null })} scroll={false} aria-label={t("calendar.prev")} className="px-3 text-ink3 hover:text-ink">‹</Link>
        <span className="min-w-[150px] text-center">{period}</span>
        <Link href={href({ d: next, day: null })} scroll={false} aria-label={t("calendar.next")} className="px-3 text-ink3 hover:text-ink">›</Link>
      </div>
      <Link href={href({ d: today, day: today })} scroll={false} className="flex h-[42px] items-center rounded-[7px] border border-line2 px-3.5 text-[14px] font-medium">
        {t("calendar.today")}
      </Link>
      <Segmented items={seg} />
    </>
  );

  const weekdayHeader = (
    <div className="grid grid-cols-7 pb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink3">
      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
        <span key={d} className="pl-2">{t("weekday.short", { day: String(d) })}</span>
      ))}
    </div>
  );

  const inMonth = (d: IsoDate) => d.slice(0, 7) === first.slice(0, 7);
  const selectedTasks = on(selected);

  return (
    <>
      <PageHeader title={t("calendar.title")} eyebrow={t("calendar.eyebrow")} border actions={<span className="hidden items-center gap-3.5 lg:flex">{navControls}</span>} />

      {/* Mobile (5d): segmented + strip or month dots, then the selected day's list */}
      <div className="flex flex-col gap-4 px-5 pb-[120px] lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <Segmented items={seg} />
          <div className="flex items-center text-[14px] font-medium">
            <Link href={href({ d: prev, day: null })} scroll={false} className="px-3 py-2 text-ink3">‹</Link>
            <span className="whitespace-nowrap">{period}</span>
            <Link href={href({ d: next, day: null })} scroll={false} className="px-3 py-2 text-ink3">›</Link>
          </div>
        </div>
        {view === "week" ? (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const sel = d === selected;
              return (
                <Link key={d} href={href({ day: d })} scroll={false} className={`flex flex-col items-center gap-1.5 rounded-[10px] py-2.5 ${sel ? "bg-seg text-seg-ink" : d === today ? "text-accent" : "text-ink"}`}>
                  <span className={`text-[11px] font-semibold uppercase ${sel ? "" : "text-ink3"}`}>{t("weekday.short", { day: String(weekdayIndex(d)) })}</span>
                  <span className="text-[17px] font-semibold">{Number(d.slice(8, 10))}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {shootsOn(d).length > 0 && <span className="size-1.5 rounded-full bg-accent ring-2 ring-rust-bg" />}
                    {on(d).slice(0, 3).map((x) => <span key={x.id} className="size-1.5 rounded-full" style={{ background: PRIORITY_COLOR[x.priority] }} />)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-semibold text-ink3">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => <span key={d}>{t("weekday.narrow", { day: String(d) })}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((d) => {
                const sel = d === selected;
                return (
                  <Link key={d} href={href({ day: d })} scroll={false} className="flex flex-col items-center gap-1 py-1">
                    <span className={`grid size-9 place-items-center rounded-full text-[14px] font-medium ${sel ? "bg-seg text-seg-ink" : d === today ? "text-accent" : inMonth(d) ? "text-ink" : "text-ink3"}`}>
                      {Number(d.slice(8, 10))}
                    </span>
                    <span className="flex h-1.5 gap-0.5">
                      {shootsOn(d).length > 0 && <span className="size-1.5 rounded-full bg-accent ring-2 ring-rust-bg" />}
                    {on(d).slice(0, 3).map((x) => <span key={x.id} className="size-1.5 rounded-full" style={{ background: PRIORITY_COLOR[x.priority] }} />)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <h2 className="display pt-2 text-[17px]">
          {t("weekday.long", { day: String(weekdayIndex(selected)) })}, {formatDate(selected)}
        </h2>
        {shootsOn(selected).map((s) => <ShootEvent key={s.id} shoot={s} label={shootLabel} />)}
        {selectedTasks.length ? (
          selectedTasks.map((x) => <TaskCardMobile key={x.id} task={x} today={today} />)
        ) : (
          !shootsOn(selected).length && <p className="text-[14px] text-ink3">{t("calendar.nothingThatDay")}</p>
        )}
      </div>

      {/* Desktop (5c) */}
      <div className="hidden min-h-0 flex-1 flex-col px-10 pb-6 pt-4 lg:flex">
        {weekdayHeader}
        {view === "month" ? (
          <div className="grid flex-1 grid-cols-7 border-l border-t border-line" style={{ gridAutoRows: "minmax(118px, 1fr)" }}>
            {cells.map((d) => {
              const list = on(d);
              const weekend = weekdayIndex(d) >= 5;
              const isToday = d === today;
              return (
                <div key={d} className={`flex min-h-0 flex-col gap-1 overflow-hidden border-b border-r border-line p-1.5 ${weekend ? "bg-chip" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className={`grid size-6 flex-none place-items-center rounded-full text-[12px] font-semibold ${isToday ? "bg-accent text-charcoal" : inMonth(d) ? "text-ink" : "text-ink3"}`}>
                      {Number(d.slice(8, 10))}
                    </span>
                    {weekdayIndex(d) === 0 && <span className="pr-1 text-[10.5px] font-semibold text-ink3">{t("calendar.weekShort", { n: isoWeek(d) })}</span>}
                  </div>
                  {shootsOn(d).map((s) => <ShootEvent key={s.id} shoot={s} label={shootLabel} variant="chip" />)}
                  {list.slice(0, 4).map((x) => {
                    const late = dueTone(x, today) === "late";
                    const done = x.status === "done";
                    return (
                      <TaskLink key={x.id} id={x.id} className={`flex min-w-0 items-center gap-1.5 rounded px-[7px] py-[5px] ${late ? "bg-red-bg" : "bg-surf"} ${done ? "opacity-60" : ""}`}>
                        <span className="size-[7px] flex-none rounded-[2px]" style={{ background: PRIORITY_COLOR[x.priority] }} />
                        <span className={`truncate text-[12px] font-medium leading-tight ${late ? "text-red-ink" : "text-ink"} ${done ? "line-through" : ""}`}>{x.title}</span>
                      </TaskLink>
                    );
                  })}
                  {list.length > 4 && (
                    <Link href={href({ view: "week", d })} scroll={false} className="px-1.5 text-[11.5px] font-medium text-ink3 hover:text-ink">
                      {t("calendar.more", { count: list.length - 4 })}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-7 gap-2.5">
            {weekDays.map((d) => {
              const list = on(d);
              const isToday = d === today;
              return (
                <div key={d} className="flex min-h-[calc(100dvh-230px)] flex-col gap-2 rounded-lg bg-chip px-2 py-2.5">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <span className={`whitespace-nowrap rounded-xl px-2 py-[5px] text-[13px] font-semibold leading-none ${isToday ? "bg-accent text-charcoal" : ""}`}>
                      {t("weekday.short", { day: String(weekdayIndex(d)) })} {formatShortDate(d)}
                    </span>
                    <span className="ml-auto text-[12px] font-medium text-ink3">{list.length}</span>
                  </div>
                  {shootsOn(d).map((s) => <ShootEvent key={s.id} shoot={s} label={shootLabel} variant="chip" />)}
                  {list.map((x) => {
                    const late = dueTone(x, today) === "late";
                    const done = x.status === "done";
                    return (
                      <TaskLink key={x.id} id={x.id} className={`flex flex-col gap-2 rounded-md border bg-surf p-2.5 ${late ? "border-red-line" : "border-line"} ${done ? "opacity-60" : ""}`}>
                        <span className="text-[10.5px] font-semibold uppercase leading-tight tracking-[0.1em] text-ink3">{x.client?.name ?? t("task.noClient")}</span>
                        <span className={`text-[13.5px] font-medium leading-snug ${done ? "line-through" : ""}`}>{x.title}</span>
                        <div className="flex items-center justify-between">
                          <PriorityMark priority={x.priority} />
                          <AvatarStack people={x.assignees} size={22} />
                        </div>
                      </TaskLink>
                    );
                  })}
                  {!list.length && !shootsOn(d).length && <span className="px-1 py-1.5 text-[12.5px] text-ink3">{t("calendar.noDeadlines")}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
