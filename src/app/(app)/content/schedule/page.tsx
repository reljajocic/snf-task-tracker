import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { getClientVideos, getShootDays } from "@/lib/content";
import { getLookups } from "@/lib/data";
import { rememberedClient } from "@/lib/remembered-client";
import { addDays, isoWeek, startOfWeek, today as getToday, weekdayIndex, type IsoDate } from "@/lib/dates";
import { postingStatus } from "@/lib/tasks";
import { ClientPicker } from "./ClientPicker";
import { FILTER_ROW } from "./filter-row";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { ScheduleTable, type ScheduleWeek } from "./ScheduleTable";
import { FORMATS } from "@/lib/formats";
import { PeriodNav } from "@/components/ui/PeriodNav";
import { ShownClient } from "../ContentTabs";

function monthStart(d: IsoDate) {
  return `${d.slice(0, 7)}-01`;
}
function shiftMonth(d: IsoDate, delta: number): IsoDate {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

// 2a / 2b / 2c. URL: ?client=<id>&m=YYYY-MM&view=table|calendar&profile=<name>|all&format=video|photo|carousel
export default async function SchedulePage({ searchParams }: PageProps<"/content/schedule">) {
  const [params, lookups, t, remembered] = await Promise.all([searchParams, getLookups(), getTranslations(), rememberedClient()]);
  const today = getToday();
  // Calendar by default; the table is one click away.
  const view = params.view === "table" ? "table" : "calendar";
  const clients = lookups.clients;
  const client =
    clients.find((c) => c.id === params.client) ??
    clients.find((c) => c.id === remembered) ??
    clients.find((c) => c.status === "active") ??
    clients[0];
  const m = typeof params.m === "string" && /^\d{4}-\d{2}$/.test(params.m) ? `${params.m}-01` : monthStart(today);

  // Clients posting to several profiles get a schedule per profile (first one by default).
  const profiles = client?.profiles ?? [];
  const profile = profiles.length ? (params.profile === "all" ? null : profiles.find((p) => p === params.profile) ?? profiles[0]) : null;

  // Only videos, only photos or only carousels (all by default).
  const format = FORMATS.find((f) => f === params.format) ?? null;

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = {
      client: client?.id ?? null,
      m: m.slice(0, 7),
      view: view === "calendar" ? null : view,
      profile: profiles.length ? (profile ?? "all") : null,
      format,
      ...patch,
    };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `/content/schedule?${qs}` : "/content/schedule";
  };

  if (!client) {
    return (
      <>
        <PageHeader title={t("schedule.title")} newTask={false} phone="none" />
        <p className="px-5 text-[15px] text-ink3 lg:px-10">{t("schedule.noClient")}</p>
      </>
    );
  }

  // Two months, in the table and in the calendar (its grids show whole weeks, so load a week either side).
  const periodEnd = addDays(shiftMonth(m, 2), -1);
  const videos = (await getClientVideos(client.id, { posting: { from: addDays(startOfWeek(m), -7), to: addDays(periodEnd, 7) } })).filter(
    // Videos without a profile (e.g. meant for both) show in every profile until they're posted somewhere.
    (v) => (!profile || !v.profile || v.profile === profile) && (!format || v.format === format),
  );
  // The client's shoot days in the same stretch, shown on their dates.
  const loadFrom = addDays(startOfWeek(m), -7);
  const shoots = (await getShootDays())
    .filter((s) => s.client?.id === client.id && s.date >= loadFrom && s.date <= addDays(periodEnd, 7))
    .map((s) => ({ id: s.id, date: s.date, starts_at: s.starts_at, location: s.location }));
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
    const weekShoots = shoots.filter((s) => s.date >= wk && s.date <= addDays(wk, 6));
    if (rows.length || weekShoots.length) weeks.push({ n: isoWeek(wk), from: wk, to: addDays(wk, 6), current: wk === startOfWeek(today), rows, shoots: weekShoots });
  }

  // Only filmed videos get a posting date; ideas still to shoot wait for a shoot day.
  const unscheduled = videos
    .filter((v) => !v.publish_date && !v.dropped_at && (v.phase ?? 0) < 5 && (v.shot_status === "shot" || (v.phase ?? 0) >= 2))
    .sort((a, b) => (b.phase ?? 0) - (a.phase ?? 0));
  const late = videos.filter((v) => postingStatus(v, today) === "not_published").length;

  const viewSeg = [
    { key: "calendar", label: t("schedule.calendar"), href: href({ view: null }), active: view === "calendar" },
    { key: "table", label: t("schedule.table"), href: href({ view: "table" }), active: view === "table" },
  ];
  const monthName = (d: IsoDate) => t("month.name", { m: String(Number(d.slice(5, 7))) });
  const period =
    view === "table"
      ? `${monthName(m).slice(0, 3)} – ${monthName(shiftMonth(m, 1)).slice(0, 3)} ${shiftMonth(m, 1).slice(0, 4)}`
      : `${monthName(m)} ${m.slice(0, 4)}`;
  // Keeps the month, view and profile, so closing the form lands back on the same schedule.
  const addHref = href({ new: "1", kind: "video" });

  // Client, profile and post type (on phones led by Calendar / Table): one row, sliding sideways on phones rather than stacking.
  const picker = (
    <>
      <span className="flex flex-none items-center gap-2.5 lg:hidden">
        <Segmented items={viewSeg} nowrap />
        <span aria-hidden className="mx-1 h-5 w-px bg-line2" />
      </span>
      <Suspense>
        <ClientPicker clients={clients.map((c) => ({ id: c.id, name: c.name }))} value={client.id} />
      </Suspense>
      {profiles.length > 0 && (
        <Segmented
          nowrap
          items={[
            ...profiles.map((p) => ({ key: p, label: p, href: href({ profile: p }), active: profile === p })),
            { key: "all", label: t("schedule.allProfiles"), href: href({ profile: "all" }), active: profile === null },
          ]}
        />
      )}
      <Segmented
        nowrap
        items={[
          { key: "all", label: t("schedule.allFormats"), href: href({ format: null }), active: format === null },
          ...FORMATS.map((f) => ({ key: f, label: t(`format.${f}`), href: href({ format: f }), active: format === f })),
        ]}
      />
    </>
  );

  const prev = href({ m: shiftMonth(m, -1).slice(0, 7) });
  const next = href({ m: shiftMonth(m, 1).slice(0, 7) });
  const controls = (
    <>
      <PeriodNav label={period} prevHref={prev} nextHref={next} prevLabel={t("schedule.prevMonth")} nextLabel={t("schedule.nextMonth")} />
      <Segmented items={viewSeg} />
      <Link href={addHref} scroll={false} className={buttonClass({ size: "sm" })}>
        {t("schedule.addVideo")}
      </Link>
    </>
  );

  return (
    <>
      <ShownClient id={client.id} />
      <PageHeader
        title={t("schedule.title")}
        newTask={false}
        phone="none"
        actions={<span className="hidden items-center gap-3.5 lg:flex">{controls}</span>}
      />
      {/* Phones: the month across the screen; the view leads the filter row (adding is the "+" next to the content tabs). */}
      <div className="flex px-5 pb-3 pt-3 lg:hidden">
        <PeriodNav label={period} prevHref={prev} nextHref={next} prevLabel={t("schedule.prevMonth")} nextLabel={t("schedule.nextMonth")} fill />
      </div>
      {late > 0 && (
        <p className="px-5 pb-3 text-[13px] font-medium text-red-ink lg:px-10">{t("schedule.notPublishedCount", { count: late })}</p>
      )}
      {view === "table" ? (
        <ScheduleTable weeks={weeks} unscheduled={unscheduled} today={today} clientPicker={picker} profile={profile} />
      ) : (
        <>
          <div className={FILTER_ROW}>{picker}</div>
          <ScheduleCalendar month={m} videos={videos} unscheduled={unscheduled} postingDays={client.postingDays} today={today} profile={profile} shoots={shoots} />
        </>
      )}
    </>
  );
}
