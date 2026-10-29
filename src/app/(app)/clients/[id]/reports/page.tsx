import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReportView } from "@/components/reports/ReportView";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { buildMonthReport, nextMonth } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import { ReportPublisher } from "./ReportPublisher";
import { PeriodNav } from "@/components/ui/PeriodNav";
import { PageTitle } from "@/components/shell/PageTitle";

const prevMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
};

// The client's monthly report as the portal will show it, with the team's word and "Publish to the client".
// Default: last month (a report is written once the month is over). URL: ?m=YYYY-MM
export default async function ClientReportPage({ params, searchParams }: PageProps<"/clients/[id]/reports">) {
  const [{ id }, { m }] = await Promise.all([params, searchParams]);
  const lookups = await getLookups();
  const client = lookups.clients.find((c) => c.id === id);
  if (!client) notFound();
  const month = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : prevMonth(today().slice(0, 7));
  const [t, tAll, supabase] = await Promise.all([getTranslations("report"), getTranslations(), createClient()]);
  const [report, { data: saved }] = await Promise.all([
    buildMonthReport(supabase, id, month, t("other")),
    supabase.from("portal_reports").select("summary, published_at").eq("client_id", id).eq("month", month).maybeSingle(),
  ]);
  const label = `${tAll("month.name", { m: String(Number(month.slice(5))) })} ${month.slice(0, 4)}`;

  return (
    <div className="flex max-w-[1000px] flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <PageTitle
        back={{ href: `/clients/${id}`, label: client.name }}
        title={t("title")}
        actions={<PeriodNav label={label} prevHref={`?m=${prevMonth(month)}`} nextHref={`?m=${nextMonth(month)}`} />}
      />
      <p className="text-[14px] text-ink2">{t("teamLead")}</p>
      <ReportPublisher clientId={id} month={month} summary={saved?.summary ?? null} publishedAt={saved?.published_at ?? null} canEdit={client.canManage} />
      <ReportView report={report} summary={null} t={t} />
    </div>
  );
}
