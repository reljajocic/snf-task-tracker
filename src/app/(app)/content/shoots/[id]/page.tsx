import { AutoRefresh } from "@/components/AutoRefresh";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getClientVideos, getShootDay, previousShootDate } from "@/lib/content";
import { getLookups } from "@/lib/data";
import { formatDate, today as getToday, weekdayIndex } from "@/lib/dates";
import { TIME_ZONE } from "@/lib/config";
import type { Task } from "@/lib/tasks";
import { Segmented } from "@/components/ui/Segmented";
import { ShootBoard } from "./ShootBoard";

// 2d (desktop) / 2e (mobile, on set)
export default async function ShootPage({ params, searchParams }: PageProps<"/content/shoots/[id]">) {
  const [{ id }, { view }, lookups, t] = await Promise.all([params, searchParams, getLookups(), getTranslations()]);
  const desktopView = view === "onset" ? "onset" : "sheet";
  const data = await getShootDay(id);
  if (!data || !data.day.client) notFound();
  const { day, videos } = data;
  const client = data.day.client;
  const canManage = lookups.clients.some((c) => c.id === client.id && c.isTeam);
  const [open, previous] = canManage
    ? await Promise.all([getClientVideos(client.id, { bank: true }), previousShootDate(client.id, day.date)])
    : [[], null];
  const candidates = shootCandidates(open, day.id, previous);
  const nowTime = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Names from the sign-up link and ticks from the crew show up within seconds. */}
      <AutoRefresh seconds={15} />
      <header className="flex flex-col gap-4 px-5 pb-5 pt-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pt-9">
        <div className="flex min-w-0 flex-col gap-3">
          <Link href="/content/shoots" className="text-[14px] font-medium text-ink3 hover:text-ink">
            {t("shoots.back")}
          </Link>
          <span className="text-[13px] font-medium text-ink2 lg:text-[14px]">
            {[client.name, day.location].filter(Boolean).join(" · ")}
            <span className="lg:hidden">
              {" "}
              · {t("weekday.long", { day: String(weekdayIndex(day.date)) })}, {formatDate(day.date)}
            </span>
          </span>
          <h1 className="display text-[32px] lg:text-[44px]">{t("video.shoot")}</h1>
        </div>
        <div className="hidden items-center gap-3.5 lg:flex">
          <Segmented
            items={[
              { key: "sheet", label: t("shootSheet.sheet"), href: `/content/shoots/${id}`, active: desktopView === "sheet" },
              { key: "onset", label: t("shootSheet.onSet"), href: `/content/shoots/${id}?view=onset`, active: desktopView === "onset" },
            ]}
          />
          {day.drive_url && (
            <a href={day.drive_url} target="_blank" rel="noreferrer" className="flex h-[42px] items-center rounded-[7px] border border-line2 px-3.5 text-[14px] font-medium">
              {t("shoots.footage")}
            </a>
          )}
          <span className="flex h-[42px] items-center rounded-[7px] border border-line2 px-3.5 text-[14px] font-medium">
            {t("weekday.long", { day: String(weekdayIndex(day.date)) })}, {formatDate(day.date)}
          </span>
          {canManage && (
            <Link href={`/content/shoots/${day.id}/edit`} className="flex h-[42px] items-center rounded-[7px] border border-line2 px-4 text-[14px] font-medium">
              {t("shoots.edit")}
            </Link>
          )}
        </div>
      </header>
      <ShootBoard
        day={day}
        videos={videos}
        candidates={candidates}
        canManage={canManage}
        isToday={day.date === getToday()}
        nowTime={nowTime}
        desktopView={desktopView}
        tags={lookups.clients.find((c) => c.id === client.id)?.contentTypes ?? []}
      />
    </div>
  );
}

/**
 * Videos that can go on this shoot: new ideas not on any shoot yet, and the ones that didn't get
 * filmed on the previous shoot. Filmed, published or dropped videos, and leftovers from older
 * shoots (long forgotten), are left out.
 */
function shootCandidates(videos: Task[], shootId: string, previous: string | null) {
  return videos
    .filter(
      (v) =>
        v.shoot_id !== shootId &&
        (v.phase ?? 0) < 5 &&
        !v.dropped_at &&
        v.shot_status !== "shot" &&
        (!v.shoot || v.shoot.date === previous),
    )
    .sort((a, b) => (a.phase ?? 0) - (b.phase ?? 0));
}
