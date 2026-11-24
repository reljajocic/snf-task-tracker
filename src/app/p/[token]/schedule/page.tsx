import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addDays, formatDate, formatShortDate, isoWeek, startOfWeek, today as getToday, weekdayIndex } from "@/lib/dates";
import { getPortal, getPortalVideos, portalStatus } from "@/lib/portal";
import { PortalStatusLabel } from "../bits";
import { PostTags } from "@/components/tasks/tags";
import { FORMATS, FORMAT_COLOR } from "@/lib/formats";
import { Segmented } from "@/components/ui/Segmented";
import { PeriodNav } from "@/components/ui/PeriodNav";
import { PostDate } from "./PostDate";
import { PortalCalendar, type CalendarPost } from "./PortalCalendar";

function shiftMonth(m: string, d: number) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + d, 1)).toISOString().slice(0, 7);
}

// 7b: the posting schedule from the client's side (no internal statuses, no "late").
// Calendar (month, default) or list (from this week on), all formats or just one. URL: ?view=list&m=YYYY-MM&format=photo
export default async function PortalSchedule({ params, searchParams }: PageProps<"/p/[token]/schedule">) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const portal = (await getPortal(token))!;
  if (!portal.show.schedule) notFound();
  const today = getToday();
  const view = sp.view === "list" ? "list" : "calendar";
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const gridStart = startOfWeek(`${month}-01`);
  const from = view === "list" ? startOfWeek(today) : gridStart;
  const [videos, t, waiting] = await Promise.all([
    getPortalVideos(portal.clientId, { from }),
    getTranslations({ locale: portal.locale }),
    portal.plans ? getPortalVideos(portal.clientId, { unscheduled: true }) : Promise.resolve([]),
  ]);
  const format = FORMATS.find((f) => f === sp.format) ?? null;
  const dated = videos.filter((v) => v.publish_date && v.publish_date >= from && (!format || v.format === format));
  const base = `/p/${token}/schedule`;
  // Links keep the view, month and format unless a patch changes them.
  const link = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { view: view === "list" ? "list" : null, m: typeof sp.m === "string" ? sp.m : null, format, ...patch };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `${base}?${qs}` : base;
  };
  const calendarPost = (v: (typeof videos)[number]): CalendarPost => ({
    id: v.id,
    title: v.title,
    format: v.format,
    content_type: v.content_type,
    status: portalStatus(v),
    publish_date: v.publish_date,
    filmed: v.shot_status === "shot" || v.phase >= 2,
  });
  // Filmed, no posting date yet: the client picks one (only when the team lets them plan).
  const unscheduled = waiting.filter((v) => !format || v.format === format);
  const toPlan = unscheduled.length > 0 && (
    <section className="flex flex-col gap-2.5 rounded-lg border border-accent/60 bg-surf p-4 lg:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="display text-[18px] leading-[1.1]">{t("portal.toPlan", { n: unscheduled.length })}</h2>
        <p className="text-[14px] leading-snug text-ink2">{t("portal.toPlanHint")}</p>
      </div>
      <div className="flex flex-col">
        {unscheduled.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0">
            <Link href={`/p/${token}/video/${v.id}`} className="flex min-w-0 flex-1 basis-[220px] flex-col gap-1 hover:opacity-80">
              <span className="text-[15px] font-medium leading-snug">{v.title}</span>
              <PostTags format={v.format} type={v.content_type} formatLabel={t(`format.${v.format}`)} />
            </Link>
            <PostDate token={token} taskId={v.id} date={null} min={today} compact />
          </div>
        ))}
      </div>
    </section>
  );
  const formatSwitch = (
    <Segmented
      items={[null, ...FORMATS].map((f) => ({
        key: f ?? "all",
        label: f ? t(`format.${f}`) : t("schedule.allFormats"),
        href: link({ format: f }),
        active: format === f,
        dot: f ? FORMAT_COLOR[f] : undefined,
      }))}
    />
  );
  const viewSwitch = (
    <Segmented
      items={(["calendar", "list"] as const).map((k) => ({
        key: k,
        label: t(k === "calendar" ? "portal.viewCalendar" : "portal.viewList"),
        href: link({ view: k === "calendar" ? null : "list", m: null }),
        active: view === k,
      }))}
    />
  );

  if (view === "calendar") {
    const monthLabel = (m: string) => `${t("month.name", { m: String(Number(m.slice(5, 7))) })} ${m.slice(0, 4)}`;
    // This month and the next: the client can plan ahead without paging.
    const months = [month, shiftMonth(month, 1)].map((m) => {
      const start = startOfWeek(`${m}-01`);
      const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
      return { month: m, label: monthLabel(m), weeks: days.filter((_, i) => i % 7 === 0 && (i < 35 || days[i].slice(0, 7) === m)) };
    });
    const label = monthLabel(month);
    return (
      <div className="flex flex-col gap-4 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
        <h1 className="display text-[32px] lg:text-[44px]">{t("schedule.title")}</h1>
        {portal.plans && <p className="-mt-2 text-[14px] text-ink2 lg:hidden">{t("portal.moveHint")}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {viewSwitch}
          {formatSwitch}
          <PeriodNav label={label} prevHref={link({ m: shiftMonth(month, -1) })} nextHref={link({ m: shiftMonth(month, 1) })} />
        </div>
        {/* Desktop plans in the calendar itself (drag); phones get the list of filmed videos to date. */}
        {toPlan && <div className={portal.plans ? "lg:hidden" : ""}>{toPlan}</div>}
        <PortalCalendar
          token={token}
          months={months}
          today={today}
          plans={portal.plans}
          posts={dated.map(calendarPost)}
          pool={unscheduled.map(calendarPost)}
        />
      </div>
    );
  }

  const weeks = new Map<string, typeof dated>();
  for (const v of dated) {
    const wk = startOfWeek(v.publish_date!);
    weeks.set(wk, [...(weeks.get(wk) ?? []), v]);
  }

  return (
    <div className="flex flex-col gap-2 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
      <h1 className="display pb-2 text-[32px] lg:text-[44px]">{t("schedule.title")}</h1>
      <div className="flex flex-wrap items-center gap-3">
        {viewSwitch}
        {formatSwitch}
      </div>
      {toPlan && <div className="pt-4">{toPlan}</div>}
      {[...weeks.entries()].map(([wk, list]) => (
        <div key={wk} className="flex flex-col">
          <div className="flex items-baseline gap-3 px-1 pb-2 pt-[22px] lg:px-4">
            <span className="display text-[15px] leading-none">{t("schedule.week", { n: isoWeek(wk) })}</span>
            <span className="text-[13px] font-medium text-ink3">
              {formatShortDate(wk)} – {formatDate(addDays(wk, 6))}
            </span>
            {wk === startOfWeek(today) && <span className="text-[12px] font-semibold text-accent">{t("schedule.thisWeek")}</span>}
          </div>
          <div className="snf-stack">
            {list.map((v) => {
              const status = portalStatus(v);
              const row = (
                <>
                  <span className="hidden gap-2 whitespace-nowrap text-[14px] font-medium md:flex">
                    <span className="w-[30px] text-ink3">{t("weekday.short", { day: String(weekdayIndex(v.publish_date!)) })}</span>
                    {formatDate(v.publish_date!)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[15px] font-medium leading-snug">{v.title}</span>
                    <span className="text-[13px] text-ink3">
                      <span className="mr-3 md:hidden">{formatShortDate(v.publish_date!)}</span>
                      {[v.on_camera, v.location].filter(Boolean).join(", ")}
                    </span>
                    <span className="md:hidden">
                      <PostTags format={v.format} type={v.content_type} formatLabel={t(`format.${v.format}`)} />
                    </span>
                  </div>
                  <span className="hidden md:block"><PostTags format={v.format} type={v.content_type} formatLabel={t(`format.${v.format}`)} /></span>
                  <span className="flex items-center gap-3">
                    <PortalStatusLabel status={status} />
                    {status === "awaiting" && <span className="hidden text-[13px] font-semibold text-rust-ink md:inline">{t("portal.review")}</span>}
                  </span>
                </>
              );
              const cls = "grid min-w-0 flex-1 basis-[260px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-[13px] hover:bg-hover md:grid-cols-[150px_minmax(0,1fr)_170px_250px]";
              // Every post opens: a cut to review, or its script. Planning clients also move it right here.
              return (
                <div key={v.id} className={`flex flex-wrap items-center border-t border-line first:border-t-0 ${status === "awaiting" ? "bg-rust-bg" : ""}`}>
                  <Link href={`/p/${token}/video/${v.id}`} className={cls}>
                    {row}
                  </Link>
                  {portal.plans && status !== "published" && (
                    <div className="flex px-4 pb-3 md:py-2 [&:has(>div)]:w-full">
                      <PostDate token={token} taskId={v.id} date={v.publish_date} min={today} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {!weeks.size && <p className="py-8 text-[15px] text-ink3">{t("portal.noPosts")}</p>}
    </div>
  );
}
