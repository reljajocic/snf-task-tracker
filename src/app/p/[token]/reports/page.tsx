import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { today as getToday } from "@/lib/dates";
import { getPortal, getPortalVideos } from "@/lib/portal";

function shiftMonth(m: string, d: number) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + d, 1)).toISOString().slice(0, 7);
}

// Monthly report: what was published, in total and by content type.
export default async function PortalReports({ params, searchParams }: PageProps<"/p/[token]/reports">) {
  const [{ token }, { m }] = await Promise.all([params, searchParams]);
  const portal = (await getPortal(token))!;
  const t = await getTranslations({ locale: portal.locale });
  if (!portal.show.report) notFound();
  const month = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : getToday().slice(0, 7);
  const videos = await getPortalVideos(portal.clientId, { month });
  const label = `${t("month.name", { m: String(Number(month.slice(5, 7))) })} ${month.slice(0, 4)}`;

  return (
    <div className="flex max-w-[860px] flex-col gap-6 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
      <h1 className="display text-[34px] lg:text-[44px]">{t("portal.reportsTitle")}</h1>
      <div className="flex h-[42px] items-center self-start rounded-[7px] border border-line2 text-[14px] font-medium">
        <Link href={`?m=${shiftMonth(month, -1)}`} className="px-3 text-ink3 hover:text-ink">‹</Link>
        <span className="min-w-[140px] text-center">{label}</span>
        <Link href={`?m=${shiftMonth(month, 1)}`} className="px-3 text-ink3 hover:text-ink">›</Link>
      </div>
      {/* Just the count for now; reach and engagement will come from Instagram later. */}
      <div className="flex max-w-[320px] flex-col gap-2 rounded-lg border border-line bg-surf p-6">
        <span className="display text-[64px] leading-[0.9]">{videos.length}</span>
        <span className="text-[15px] text-ink2">{t("portal.postsThisMonth")}</span>
      </div>
    </div>
  );
}
