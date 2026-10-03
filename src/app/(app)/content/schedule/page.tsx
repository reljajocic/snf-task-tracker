import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { getClientVideos } from "@/lib/content";
import { getLookups } from "@/lib/data";
import { addDays, isoWeek, startOfWeek, today as getToday, weekdayIndex, type IsoDate } from "@/lib/dates";
import { postingStatus } from "@/lib/tasks";
import { ClientPicker } from "./ClientPicker";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { ScheduleTable, type ScheduleWeek } from "./ScheduleTable";

function monthStart(d: IsoDate) {
  return `${d.slice(0, 7)}-01`;
}
function shiftMonth(d: IsoDate, delta: number): IsoDate {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

// 2a / 2b / 2c. URL: ?client=<id>&m=YYYY-MM&view=table|calendar
export default async function SchedulePage({ searchParams }: PageProps<"/content/schedule">) {
  const [params, lookups, t] = await Promise.all([searchParams, getLookups(), getTranslations()]);
  const today = getToday();
  const view = params.view === "calendar" ? "calendar" : "table";
  const clients = lookups.clients;
  const client = clients.find((c) => c.id === params.client) ?? clients.find((c) => c.status === "active") ?? clients[0];
  const m = typeof params.m === "string" && /^\d{4}-\d{2}$/.test(params.m) ? `${params.m}-01` : monthStart(today);

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { client: client?.id ?? null, m: m.slice(0, 7), view: view === "table" ? null : view, ...patch };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `/content/schedule?${qs}` : "/content/schedule";
  };

  if (!client) {
    return (
      <>
        <PageHeader title={t("schedule.title")} newTask={false} />
        <p className="px-5 text-[15px] text-ink3 lg:px-10">{t("schedule.noClient")}</p>
      </>
    );
  }

  const videos = await getClientVideos(client.id);
  // Table: two months. Calendar: one month.
  const periodEnd = addDays(shiftMonth(m, view === "table" ? 2 : 1), -1);
  const byDate = new Map<IsoDate, typeof videos>();
  for (const v of videos) if (v.publish_date) byDate.set(v.publish_date, [...(byDate.get(v.publish_date) ?? []), v]);

  const weeks: ScheduleWeek[] = [];
  for (let wk = startOfWeek(m); wk <= periodEnd; wk = addDays(wk, 7)) {
    const rows: ScheduleWeek["rows"] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(wk, i);
      if (d < m || d > periodEnd) continue;
      const list = byDate.get(d) ?? [];
      if (list.length) list.forEach((v) => rows.push({ date: d, video: v }));
      else if (client.postingDays.includes(weekdayIndex(d))) rows.push({ date: d, video: null });
    }
    if (rows.length) weeks.push({ n: isoWeek(wk), from: wk, to: addDays(wk, 6), current: wk === startOfWeek(today), rows });
  }

  const unscheduled = videos
    .filter((v) => !v.publish_date && !v.dropped_at && (v.phase ?? 0) < 5)
    .sort((a, b) => (b.phase ?? 0) - (a.phase ?? 0));
  const late = videos.filter((v) => postingStatus(v, today) === "not_published").length;

  const viewSeg = [
    { key: "table", label: t("schedule.table"), href: href({ view: null }), active: view === "table" },
    { key: "calendar", label: t("schedule.calendar"), href: href({ view: "calendar" }), active: view === "calendar" },
  ];
  const monthName = (d: IsoDate) => t("month.name", { m: String(Number(d.slice(5, 7))) });
  const period =
    view === "table"
      ? `${monthName(m).slice(0, 3)} – ${monthName(shiftMonth(m, 1)).slice(0, 3)} ${shiftMonth(m, 1).slice(0, 4)}`
      : `${monthName(m)} ${m.slice(0, 4)}`;
  const addHref = `?new=1&kind=video&client=${client.id}`;

  const picker = (
    <Suspense>
      <ClientPicker clients={clients.map((c) => ({ id: c.id, name: c.name }))} value={client.id} />
    </Suspense>
  );

  const controls = (
    <>
      <div className="flex h-[42px] items-center whitespace-nowrap rounded-[7px] border border-line2 text-[14px] font-medium">
        <Link href={href({ m: shiftMonth(m, -1).slice(0, 7) })} scroll={false} className="px-3 text-ink3 hover:text-ink">‹</Link>
        <span className="min-w-[120px] text-center">{period}</span>
        <Link href={href({ m: shiftMonth(m, 1).slice(0, 7) })} scroll={false} className="px-3 text-ink3 hover:text-ink">›</Link>
      </div>
      <Segmented items={viewSeg} />
      <Link href={addHref} scroll={false} className={buttonClass({ size: "sm", className: "hidden lg:inline-flex" })}>
        {t("schedule.addVideo")}
      </Link>
    </>
  );

  return (
    <>
      <PageHeader
        title={t("schedule.title")}
        newTask={false}
        actions={<span className="hidden items-center gap-3.5 lg:flex">{controls}</span>}
      />
      <div className="flex flex-wrap items-center gap-2.5 px-5 pb-3 lg:hidden">{controls}</div>
      {late > 0 && (
        <p className="px-5 pb-3 text-[13px] font-medium text-red-ink lg:px-10">{t("schedule.notPublishedCount", { count: late })}</p>
      )}
      {view === "table" ? (
        <ScheduleTable weeks={weeks} unscheduled={unscheduled} today={today} clientPicker={picker} />
      ) : (
        <>
          <div className="border-b border-line px-5 pb-[18px] lg:px-10">{picker}</div>
          <ScheduleCalendar month={m} videos={videos} unscheduled={unscheduled} postingDays={client.postingDays} today={today} />
        </>
      )}
    </>
  );
}
