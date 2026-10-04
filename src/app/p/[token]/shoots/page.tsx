import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDate, today as getToday, weekdayIndex } from "@/lib/dates";
import { getPortal, getPortalShoots, getPortalScriptProgress } from "@/lib/portal";

export default async function PortalShoots({ params }: PageProps<"/p/[token]/shoots">) {
  const { token } = await params;
  const portal = (await getPortal(token))!;
  if (!portal.show.shoots && !portal.show.scripts) notFound();
  const [shoots, progress, t] = await Promise.all([getPortalShoots(portal.clientId), getPortalScriptProgress(portal.clientId), getTranslations({ locale: portal.locale })]);
  const today = getToday();
  const list = [...shoots.filter((s) => s.date >= today), ...shoots.filter((s) => s.date < today).reverse()];

  return (
    <div className="flex flex-col gap-5 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
      <h1 className="display text-[34px] lg:text-[44px]">{t("portal.shootsTitle")}</h1>
      {list.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const { total, approved, changes } = progress.get(s.id) ?? { total: 0, approved: 0, changes: 0 };
            return (
              <Link key={s.id} href={`/p/${token}/shoots/${s.id}`} className={`flex flex-col gap-2 rounded-lg border border-line bg-surf p-[18px] ${s.date < today ? "opacity-70" : ""}`}>
                <span className="text-[17px] font-medium">
                  {t("weekday.long", { day: String(weekdayIndex(s.date)) })}, {formatDate(s.date)}
                </span>
                <span className="text-[14px] text-ink2">
                  {[s.location, s.starts_at && `${s.starts_at}${s.ends_at ? `–${s.ends_at}` : ""}`, t("portal.scriptsCount", { count: total })].filter(Boolean).join(" · ")}
                </span>
                {portal.show.scripts && total > 0 && (
                  <>
                    <span className="text-[13px] text-ink3">{t("portal.scriptsProgress", { approved, total, changes })}</span>
                    <div className="h-[5px] overflow-hidden rounded-[3px] bg-chip">
                      <div className="h-full bg-[var(--status-done)]" style={{ width: `${(approved / total) * 100}%` }} />
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-[15px] text-ink3">{t("portal.noShoots")}</p>
      )}
    </div>
  );
}
