import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReportView } from "@/components/reports/ReportView";
import { getPortal } from "@/lib/portal";
import { buildMonthReport } from "@/lib/report";
import { createAdminClient } from "@/lib/supabase/server";
import { buttonClass } from "@/components/ui/Button";

// Monthly reports the team has published (a month the team hasn't published isn't shown).
// Default: the latest one. URL: ?m=YYYY-MM
export default async function PortalReports({ params, searchParams }: PageProps<"/p/[token]/reports">) {
  const [{ token }, { m, ig }] = await Promise.all([params, searchParams]);
  const portal = (await getPortal(token))!;
  if (!portal.show.report) notFound();
  const [t, tAll, tIg] = await Promise.all([
    getTranslations({ locale: portal.locale, namespace: "report" }),
    getTranslations({ locale: portal.locale }),
    getTranslations({ locale: portal.locale, namespace: "instagram" }),
  ]);
  // Server-side, for this client only (the token was checked by getPortal).
  const db = createAdminClient();
  const { data: published } = await db
    .from("portal_reports")
    .select("month, summary")
    .eq("client_id", portal.clientId)
    .not("published_at", "is", null)
    .order("month", { ascending: false });
  const months = published ?? [];
  const { data: instagram } = await db.from("instagram_accounts").select("username").eq("client_id", portal.clientId).maybeSingle();
  const igStatus = typeof ig === "string" ? ig : null;
  const current = months.find((r) => r.month === m) ?? months[0];
  const label = (month: string) => `${tAll("month.name", { m: String(Number(month.slice(5))) })} ${month.slice(0, 4)}`;

  return (
    <div className="flex max-w-[960px] flex-col gap-6 px-5 pb-12 pt-8 lg:px-12 lg:pt-10">
      <h1 className="display text-[32px] lg:text-[44px]">{tAll("portal.reportsTitle")}</h1>
      {/* The client can connect their own Instagram here (only while none is connected; changes go through the team). */}
      {igStatus === "connected" && instagram && <p className="text-[14px] font-medium text-[var(--status-done)]">{tIg("portalConnected", { name: instagram.username ?? "" })}</p>}
      {igStatus && igStatus !== "connected" && <p className="text-[14px] text-red-ink">{tIg(`status.${igStatus}`)}</p>}
      {!instagram && (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surf p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[520px] text-[14px] leading-relaxed text-ink2">{tIg("portalLead")}</p>
          <a href={`/api/instagram/connect?portal=${token}`} className={buttonClass({ size: "sm" })}>{tIg("connect")}</a>
        </section>
      )}
      {current ? (
        <>
          {months.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {months.map((r) => (
                <Link
                  key={r.month}
                  href={`?m=${r.month}`}
                  className={`flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium ${r.month === current.month ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`}
                >
                  {label(r.month)}
                </Link>
              ))}
            </div>
          )}
          <h2 className="display text-[22px] leading-none lg:text-[26px]">{label(current.month)}</h2>
          <ReportView report={await buildMonthReport(db, portal.clientId, current.month, t("other"))} summary={current.summary} t={t} formatLabel={(f) => tAll(`format.${f}`)} />
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[15px] text-ink3">{t("noneYet")}</p>
      )}
    </div>
  );
}
