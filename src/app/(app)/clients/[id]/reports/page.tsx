import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReportView } from "@/components/reports/ReportView";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { buildMonthReport, nextMonth } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import { ReportPublisher } from "./ReportPublisher";
import { PeriodNav } from "@/components/ui/PeriodNav";
import { ClientHeader } from "../ClientHeader";
import { getClient } from "@/lib/clients";
import { requireProfile } from "@/lib/auth";
import { getInvoiceAccess } from "@/lib/finance";

const prevMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
};

// The client's monthly report as the portal will show it, with the team's word and "Publish to the client".
// Default: last month (a report is written once the month is over). URL: ?m=YYYY-MM
export default async function ClientReportPage({ params, searchParams }: PageProps<"/clients/[id]/reports">) {
  const [{ id }, { m }] = await Promise.all([params, searchParams]);
  const [lookups, data, me, invoiceAccess] = await Promise.all([getLookups(), getClient(id), requireProfile(), getInvoiceAccess()]);
  const client = lookups.clients.find((c) => c.id === id);
  if (!client || !data) notFound();
  const month = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : prevMonth(today().slice(0, 7));
  const [t, tAll, supabase] = await Promise.all([getTranslations("report"), getTranslations(), createClient()]);
  const [report, { data: saved }] = await Promise.all([
    buildMonthReport(supabase, id, month, t("other")),
    supabase.from("portal_reports").select("summary, published_at").eq("client_id", id).eq("month", month).maybeSingle(),
  ]);
  const label = `${tAll("month.name", { m: String(Number(month.slice(5))) })} ${month.slice(0, 4)}`;

  return (
    <div className="flex flex-col">
      <ClientHeader
        client={data.client}
        active="reports"
        canManage={me.role === "admin" || client.canManage}
        invoices={invoiceAccess.finance || invoiceAccess.clientIds.includes(id)}
      />
      <div className="flex max-w-[1000px] flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12">
      {/* The month is picked right here; no second title repeating it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-[14px] text-ink2">{t("teamLead")}</p>
        <PeriodNav label={label} prevHref={`?m=${prevMonth(month)}`} nextHref={`?m=${nextMonth(month)}`} />
      </div>
      <ReportPublisher clientId={id} month={month} summary={saved?.summary ?? null} publishedAt={saved?.published_at ?? null} canEdit={client.canManage} />
      <ReportView report={report} summary={null} t={t} formatLabel={(f) => tAll(`format.${f}`)} />
      </div>
    </div>
  );
}
