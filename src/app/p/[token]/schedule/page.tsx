import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addDays, formatDate, formatShortDate, isoWeek, startOfWeek, today as getToday, weekdayIndex } from "@/lib/dates";
import { getPortal, getPortalVideos, portalStatus } from "@/lib/portal";
import { PortalStatusLabel, TypeTag } from "../bits";

// 7b: the posting schedule from the client's side (no internal statuses, no "late").
export default async function PortalSchedule({ params }: PageProps<"/p/[token]/schedule">) {
  const { token } = await params;
  const portal = (await getPortal(token))!;
  if (!portal.show.schedule) notFound();
  const today = getToday();
  const from = addDays(startOfWeek(today), -14);
  const [videos, t] = await Promise.all([getPortalVideos(portal.clientId, { from }), getTranslations()]);
  const dated = videos.filter((v) => v.publish_date && v.publish_date >= from);

  const weeks = new Map<string, typeof dated>();
  for (const v of dated) {
    const wk = startOfWeek(v.publish_date!);
    weeks.set(wk, [...(weeks.get(wk) ?? []), v]);
  }

  return (
    <div className="flex flex-col gap-2 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
      <h1 className="display pb-2 text-[34px] lg:text-[44px]">{t("schedule.title")}</h1>
      {[...weeks.entries()].map(([wk, list]) => (
        <div key={wk} className="flex flex-col">
          <div className="flex items-baseline gap-3 px-1 pb-2 pt-[22px] lg:px-4">
            <span className="display text-[15px] leading-none">{t("schedule.week", { n: isoWeek(wk) })}</span>
            <span className="text-[13px] font-medium text-ink3">
              {formatShortDate(wk)} – {formatDate(addDays(wk, 6))}
            </span>
            {wk === startOfWeek(today) && <span className="text-[12px] font-semibold text-accent">{t("schedule.thisWeek")}</span>}
          </div>
          <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surf">
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
                  </div>
                  <span className="hidden md:block">{v.content_type && <TypeTag>{v.content_type}</TypeTag>}</span>
                  <span className="flex items-center gap-3">
                    <PortalStatusLabel status={status} />
                    {status === "awaiting" && <span className="hidden text-[13px] font-semibold text-rust-ink md:inline">{t("portal.review")}</span>}
                  </span>
                </>
              );
              const cls = `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line px-4 py-[13px] first:border-t-0 md:grid-cols-[150px_minmax(0,1fr)_64px_250px] ${
                status === "awaiting" ? "bg-rust-bg" : ""
              }`;
              return status === "awaiting" && portal.show.review ? (
                <Link key={v.id} href={`/p/${token}/video/${v.id}`} className={cls}>{row}</Link>
              ) : (
                <div key={v.id} className={cls}>{row}</div>
              );
            })}
          </div>
        </div>
      ))}
      {!weeks.size && <p className="py-8 text-[15px] text-ink3">{t("portal.noPosts")}</p>}
    </div>
  );
}
