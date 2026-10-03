import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { AvatarStack } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { getShootDays, type ShootDay } from "@/lib/content";
import { getLookups } from "@/lib/data";
import { formatDate, today as getToday, weekdayIndex } from "@/lib/dates";
import { ImportSheet } from "./ImportSheet";

export default async function ShootsPage() {
  const [days, lookups, t] = await Promise.all([getShootDays(), getLookups(), getTranslations()]);
  const today = getToday();
  const upcoming = days.filter((d) => d.date >= today);
  const past = days.filter((d) => d.date < today).reverse();
  const canCreate = lookups.clients.some((c) => c.isTeam);

  const card = (d: ShootDay) => {
    const pct = d.total ? Math.round((d.shot / d.total) * 100) : 0;
    return (
      <Link key={d.id} href={`/content/shoots/${d.id}`} className="flex flex-col gap-3.5 rounded-lg border border-line bg-surf p-[18px] hover:border-line2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink3">
              {[d.client?.name, d.location].filter(Boolean).join(" · ")}
            </span>
            <span className="text-[17px] font-medium leading-tight">
              {t("weekday.long", { day: String(weekdayIndex(d.date)) })}, {formatDate(d.date)}
            </span>
          </div>
          {d.date === today && <span className="rounded-full bg-rust-bg px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rust-ink">{t("shoots.now")}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-chip">
            <div className="h-full bg-[var(--status-in-progress)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink3">
              {d.total ? t("shoots.shotOf", { shot: d.shot, total: d.total }) : t("shoots.videos", { count: 0 })}
              {d.starts_at ? ` · ${d.starts_at}${d.ends_at ? `–${d.ends_at}` : ""}` : ""}
            </span>
            <AvatarStack people={d.crew} size={24} />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title={t("shoots.title")}
        newTask={false}
        actions={
          canCreate ? (
            <div className="flex flex-wrap items-start gap-3">
              <ImportSheet clients={lookups.clients.filter((c) => c.isTeam).map((c) => ({ id: c.id, name: c.name }))} />
              <Link href="/content/shoots/new" className={buttonClass({ size: "sm" })}>{t("shoots.new")}</Link>
            </div>
          ) : null
        }
      />
      <div className="flex flex-col gap-9 px-5 pb-[120px] lg:px-10 lg:pb-12">
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[19px] lg:text-[20px]">{t("shoots.upcoming")}</h2>
          {upcoming.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{upcoming.map(card)}</div>
          ) : (
            <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("shoots.none")}</p>
          )}
        </section>
        {past.length > 0 && (
          <section className="flex flex-col gap-3.5">
            <h2 className="display text-[19px] lg:text-[20px]">{t("shoots.past")}</h2>
            <div className="grid grid-cols-1 gap-3 opacity-80 sm:grid-cols-2 xl:grid-cols-3">{past.map(card)}</div>
          </section>
        )}
      </div>
    </>
  );
}
