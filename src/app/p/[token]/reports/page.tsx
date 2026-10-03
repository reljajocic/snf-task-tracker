import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDate, today as getToday } from "@/lib/dates";
import { getPortal, getPortalVideos } from "@/lib/portal";

function shiftMonth(m: string, d: number) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + d, 1)).toISOString().slice(0, 7);
}

// Monthly report: what was published, in total and by content type.
export default async function PortalReports({ params, searchParams }: PageProps<"/p/[token]/reports">) {
  const [{ token }, { m }, t] = await Promise.all([params, searchParams, getTranslations()]);
  const portal = (await getPortal(token))!;
  if (!portal.show.report) notFound();
  const month = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : getToday().slice(0, 7);
  const videos = await getPortalVideos(portal.clientId, { month });
  const byType = new Map<string, number>();
  for (const v of videos) byType.set(v.content_type ?? "—", (byType.get(v.content_type ?? "—") ?? 0) + 1);
  const label = `${t("month.name", { m: String(Number(month.slice(5, 7))) })} ${month.slice(0, 4)}`;

  return (
    <div className="flex max-w-[860px] flex-col gap-6 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
      <h1 className="display text-[34px] lg:text-[44px]">{t("portal.reportsTitle")}</h1>
      <div className="flex h-[42px] items-center self-start rounded-[7px] border border-line2 text-[14px] font-medium">
        <Link href={`?m=${shiftMonth(month, -1)}`} className="px-3 text-ink3 hover:text-ink">‹</Link>
        <span className="min-w-[140px] text-center">{label}</span>
        <Link href={`?m=${shiftMonth(month, 1)}`} className="px-3 text-ink3 hover:text-ink">›</Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surf p-5">
          <span className="display text-[56px] leading-[0.9]">{videos.length}</span>
          <span className="text-[14px] text-ink2">{t("portal.postsThisMonth")}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-line bg-surf px-5 py-2">
          <span className="eyebrow py-2.5">{t("portal.byType")}</span>
          {[...byType.entries()].map(([type, n]) => (
            <div key={type} className="grid grid-cols-[80px_minmax(0,1fr)_32px] items-center gap-3 border-t border-line py-2.5">
              <span className="text-[14px] font-medium">{type}</span>
              <div className="h-1.5 overflow-hidden rounded-[3px] bg-chip">
                <div className="h-full bg-ink3" style={{ width: `${(n / videos.length) * 100}%` }} />
              </div>
              <span className="text-right text-[14px] font-semibold">{n}</span>
            </div>
          ))}
          {!byType.size && <span className="border-t border-line py-3 text-[14px] text-ink3">{t("portal.noReport")}</span>}
        </div>
      </div>
      {videos.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surf">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 first:border-t-0">
              <span className="text-[15px] font-medium">{v.title}</span>
              <span className="whitespace-nowrap text-[13px] text-ink3">
                {v.content_type ? `${v.content_type} · ` : ""}
                {formatDate(v.publish_date!)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
