import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatDate, today as getToday, weekdayIndex } from "@/lib/dates";
import { getPortal, getPortalScriptProgress, getPortalShoots, getPortalVideos, portalStatus } from "@/lib/portal";
import { Poster, PortalStatusLabel, TypeTag } from "./bits";

// 7a (desktop) / 7e (mobile): portal home.
export default async function PortalHome({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const portal = (await getPortal(token))!;
  const today = getToday();
  const month = today.slice(0, 7);
  const [videos, publishedThisMonth, progress, shoots, t] = await Promise.all([
    getPortalVideos(portal.clientId, { open: today }),
    getPortalVideos(portal.clientId, { month }),
    getPortalScriptProgress(portal.clientId),
    getPortalShoots(portal.clientId),
    getTranslations({ locale: portal.locale }),
  ]);
  const base = `/p/${token}`;
  const day = (d: string) => t("weekday.short", { day: String(weekdayIndex(d)) });

  const awaitingVideos = portal.show.review ? videos.filter((v) => portalStatus(v) === "awaiting") : [];
  const scriptPacks = portal.show.scripts
    ? shoots
        .filter((s) => s.date >= today)
        .map((s) => ({ shoot: s, ...(progress.get(s.id) ?? { total: 0, approved: 0, changes: 0 }) }))
        .filter((p) => p.total > 0 && p.approved + p.changes < p.total)
    : [];
  const queue = awaitingVideos.length + scriptPacks.length;

  const nextPosts = videos.filter((v) => v.publish_date && v.publish_date >= today).slice(0, 5);
  const nextShoot = shoots.find((s) => s.date >= today) ?? null;
  const byType = new Map<string, number>();
  for (const v of publishedThisMonth) byType.set(v.content_type ?? "—", (byType.get(v.content_type ?? "—") ?? 0) + 1);

  const h2 = (s: string) => <h2 className="display whitespace-nowrap text-[19px] leading-[1.1] lg:text-[20px]">{s}</h2>;

  return (
    <div className="grid grid-cols-1 items-start gap-10 px-5 pb-12 pt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-12 lg:pt-10">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink3 lg:text-[13px]">
            {t("weekday.long", { day: String(weekdayIndex(today)) })}, {formatDate(today)}
          </span>
          <h1 className="display text-[34px] lg:text-[48px]">{t("portal.yourContent")}</h1>
        </div>

        {(portal.show.review || portal.show.scripts) && (
          <section className="flex flex-col gap-3.5">
            <div className="flex items-baseline gap-3">
              {h2(t("portal.awaiting"))}
              {queue > 0 && <span className="text-[14px] font-semibold text-accent">{queue}</span>}
            </div>
            {queue ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {awaitingVideos.map((v) => (
                  <Link key={v.id} href={`${base}/video/${v.id}`} className="flex gap-4 rounded-lg border border-accent bg-surf p-3.5">
                    <Poster className="h-32 w-[72px]" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-accent">
                        {t("portal.videoVersion", { n: v.versions[0].version })}
                      </span>
                      <span className="text-[17px] font-medium leading-snug">{v.title}</span>
                      {v.publish_date && (
                        <span className="text-[14px] text-ink2">{t("portal.postOn", { date: `${day(v.publish_date)}, ${formatDate(v.publish_date)}` })}</span>
                      )}
                      <span className="mt-auto text-[14px] font-semibold text-rust-ink">{t("portal.reviewCta")}</span>
                    </div>
                  </Link>
                ))}
                {scriptPacks.map((p) => (
                  <Link key={p.shoot.id} href={`${base}/shoots/${p.shoot.id}`} className="flex flex-col gap-2 rounded-lg border border-line bg-surf p-[18px]">
                    <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink3">{t("portal.scriptsFor")}</span>
                    <span className="text-[17px] font-medium leading-snug">
                      {t("portal.shootOn", { date: formatDate(p.shoot.date), location: p.shoot.location ? `, ${p.shoot.location}` : "" })}
                    </span>
                    <span className="text-[14px] text-ink2">{t("portal.scriptsProgress", { approved: p.approved, total: p.total, changes: p.changes })}</span>
                    <div className="h-[5px] overflow-hidden rounded-[3px] bg-chip">
                      <div className="h-full bg-[var(--status-done)]" style={{ width: `${(p.approved / p.total) * 100}%` }} />
                    </div>
                    <span className="mt-auto pt-2 text-[14px] font-semibold text-rust-ink">{t("portal.reviewScripts")}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("portal.nothingAwaiting")}</p>
            )}
          </section>
        )}

        {portal.show.schedule && (
          <section className="flex flex-col gap-3.5">
            <div className="flex items-baseline justify-between">
              {h2(t("portal.nextPosts"))}
              <Link href={`${base}/schedule`} className="text-[14px] font-medium text-ink2 hover:text-ink">{t("portal.fullSchedule")}</Link>
            </div>
            {nextPosts.length ? (
              <div className="snf-stack">
                {nextPosts.map((v) => (
                  <div key={v.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line bg-surf px-[18px] py-3.5 first:border-t-0 md:grid-cols-[140px_minmax(0,1fr)_60px_190px]">
                    <span className="hidden gap-2 whitespace-nowrap text-[14px] font-medium md:flex">
                      <span className="w-[30px] text-ink3">{day(v.publish_date!)}</span>
                      {formatDate(v.publish_date!)}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[15px] font-medium leading-snug">{v.title}</span>
                      <span className="text-[13px] text-ink3">
                        <span className="md:hidden">{day(v.publish_date!)} {formatDate(v.publish_date!)} · </span>
                        {[v.on_camera, v.location].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className="hidden md:block">{v.content_type && <TypeTag>{v.content_type}</TypeTag>}</span>
                    <PortalStatusLabel status={portalStatus(v)} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-ink3">{t("portal.noPosts")}</p>
            )}
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-10 lg:pt-[92px]">
        {portal.show.shoots && (
          <section className="flex flex-col gap-3.5">
            {h2(t("portal.nextShoot"))}
            {nextShoot ? (
              <Link href={`${base}/shoots/${nextShoot.id}`} className="flex flex-col gap-1.5 rounded-lg border border-line bg-surf p-[18px]">
                <span className="text-[17px] font-medium">
                  {t("weekday.long", { day: String(weekdayIndex(nextShoot.date)) })}, {formatDate(nextShoot.date)}
                </span>
                <span className="text-[14px] text-ink2">
                  {[nextShoot.location, nextShoot.starts_at && `${nextShoot.starts_at}${nextShoot.ends_at ? `–${nextShoot.ends_at}` : ""}`].filter(Boolean).join(" · ")}
                </span>
              </Link>
            ) : (
              <p className="text-[14px] text-ink3">{t("portal.noShoot")}</p>
            )}
          </section>
        )}
        {portal.show.report && (
          <section className="flex flex-col gap-3.5">
            {h2(t("portal.report", { month: t("month.name", { m: String(Number(month.slice(5, 7))) }) }))}
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-surf p-[18px]">
              <div className="flex items-baseline gap-2.5">
                <span className="display text-[44px] leading-[0.9]">{publishedThisMonth.length}</span>
                <span className="text-[14px] text-ink2">{t("portal.published")}</span>
              </div>
              {byType.size > 0 ? (
                <div className="flex flex-col">
                  {[...byType.entries()].map(([type, n]) => (
                    <div key={type} className="flex justify-between border-t border-line py-2.5 text-[14px]">
                      <span className="text-ink2">{type}</span>
                      <span className="font-semibold">{n}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[13px] text-ink3">{t("portal.noReport")}</span>
              )}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
