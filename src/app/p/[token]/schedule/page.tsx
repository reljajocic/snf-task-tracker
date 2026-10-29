import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addDays, formatDate, formatShortDate, isoWeek, startOfWeek, today as getToday, weekdayIndex } from "@/lib/dates";
import { PORTAL_STATUS_COLOR, getPortal, getPortalVideos, portalStatus } from "@/lib/portal";
import { PortalStatusLabel } from "../bits";
import { PostTags } from "@/components/tasks/tags";
import { FORMATS, FORMAT_COLOR } from "@/lib/formats";

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
  const [videos, t] = await Promise.all([getPortalVideos(portal.clientId, { from }), getTranslations({ locale: portal.locale })]);
  const format = FORMATS.find((f) => f === sp.format) ?? null;
  const dated = videos.filter((v) => v.publish_date && v.publish_date >= from && (!format || v.format === format));
  const base = `/p/${token}/schedule`;
  // Links keep the view, month and format unless a patch changes them.
  const link = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { view: view === "list" ? "list" : null, m: typeof sp.m === "string" ? sp.m : null, format, ...patch };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `${base}?${qs}` : base;
  };
  const formatSwitch = (
    <div className="inline-flex flex-wrap gap-0.5 self-start rounded-[7px] border border-line2 p-[3px]">
      {[null, ...FORMATS].map((f) => (
        <Link
          key={f ?? "all"}
          href={link({ format: f })}
          className={`flex h-9 items-center gap-1.5 rounded-[5px] px-3.5 text-[14px] font-medium ${format === f ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
        >
          {f && <span className="size-2 rounded-full" style={{ background: FORMAT_COLOR[f] }} />}
          {f ? t(`format.${f}`) : t("schedule.allFormats")}
        </Link>
      ))}
    </div>
  );
  const viewSwitch = (
    <div className="inline-flex gap-0.5 self-start rounded-[7px] border border-line2 p-[3px]">
      {(["calendar", "list"] as const).map((k) => (
        <Link
          key={k}
          href={link({ view: k === "calendar" ? null : "list", m: null })}
          className={`flex h-9 items-center rounded-[5px] px-4 text-[14px] font-medium ${view === k ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
        >
          {t(k === "calendar" ? "portal.viewCalendar" : "portal.viewList")}
        </Link>
      ))}
    </div>
  );

  if (view === "calendar") {
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const weeksInMonth = days.filter((_, i) => i % 7 === 0 && (i < 35 || days[i].slice(0, 7) === month));
    const label = `${t("month.name", { m: String(Number(month.slice(5, 7))) })} ${month.slice(0, 4)}`;
    return (
      <div className="flex flex-col gap-4 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
        <h1 className="display text-[32px] lg:text-[44px]">{t("schedule.title")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {viewSwitch}
          {formatSwitch}
          <div className="flex h-[42px] items-center rounded-[7px] border border-line2 text-[14px] font-medium">
            <Link href={link({ m: shiftMonth(month, -1) })} className="px-3 text-ink3 hover:text-ink">‹</Link>
            <span className="min-w-[140px] text-center">{label}</span>
            <Link href={link({ m: shiftMonth(month, 1) })} className="px-3 text-ink3 hover:text-ink">›</Link>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink3">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <span key={d} className="px-1.5">{t("weekday.short", { day: String(d) })}</span>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {weeksInMonth.map((wk) => (
            <div key={wk} className="grid grid-cols-7 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const d = addDays(wk, i);
                const posts = dated.filter((v) => v.publish_date === d);
                const inMonth = d.slice(0, 7) === month;
                return (
                  <div
                    key={d}
                    className={`flex min-h-[56px] flex-col gap-1 rounded-lg border p-1.5 lg:min-h-[108px] lg:p-2 ${d === today ? "border-accent" : "border-line"} ${inMonth ? "bg-surf" : "opacity-40"}`}
                  >
                    <span className={`text-[12px] font-semibold ${d === today ? "text-accent" : "text-ink3"}`}>{Number(d.slice(8))}</span>
                    {posts.map((v) => {
                      const status = portalStatus(v);
                      const chip = (
                        // Phones: a cell is ~45px wide, so just the status dot, ringed in the format's colour (titles are in
                        // the list view). Desktop: the format's colour down the left edge and its name above the title.
                        <span
                          title={`${t(`format.${v.format}`)} · ${v.title}`}
                          style={{ borderLeftColor: FORMAT_COLOR[v.format] }}
                          className="flex items-center gap-1.5 text-[13px] font-medium leading-tight lg:flex-col lg:items-start lg:gap-0.5 lg:rounded-md lg:border-l-[3px] lg:bg-chip lg:px-1.5 lg:py-1"
                        >
                          <span
                            className="size-2 flex-none rounded-full lg:hidden"
                            style={{ background: PORTAL_STATUS_COLOR[status], boxShadow: `0 0 0 1.5px var(--surf), 0 0 0 3px ${FORMAT_COLOR[v.format]}` }}
                          />
                          <span className="hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] lg:flex" style={{ color: FORMAT_COLOR[v.format] }}>
                            <span className="size-1.5 rounded-full" style={{ background: PORTAL_STATUS_COLOR[status] }} />
                            {t(`format.${v.format}`)}
                          </span>
                          <span className="hidden min-w-0 break-words lg:line-clamp-2">{v.title}</span>
                        </span>
                      );
                      return (
                        <Link key={v.id} href={`/p/${token}/video/${v.id}`} className="hover:opacity-80">
                          {chip}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
                      <span className="md:hidden">{formatShortDate(v.publish_date!)} · </span>
                      {[v.on_camera, v.location].filter(Boolean).join(" · ")}
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
              const cls = `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line px-4 py-[13px] first:border-t-0 md:grid-cols-[150px_minmax(0,1fr)_170px_250px] ${
                status === "awaiting" ? "bg-rust-bg" : ""
              }`;
              // Every post opens: a cut to review, or its script.
              return (
                <Link key={v.id} href={`/p/${token}/video/${v.id}`} className={`${cls} hover:bg-hover`}>
                  {row}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {!weeks.size && <p className="py-8 text-[15px] text-ink3">{t("portal.noPosts")}</p>}
    </div>
  );
}
