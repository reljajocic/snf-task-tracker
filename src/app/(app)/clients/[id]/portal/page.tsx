import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { formatDate } from "@/lib/dates";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { InstagramPanel } from "./InstagramPanel";
import { PortalSettings } from "./PortalSettings";
import { ClientHeader } from "../ClientHeader";
import { buttonClass } from "@/components/ui/Button";
import { getInvoiceAccess } from "@/lib/finance";

// 7d: our screen for configuring a client's portal.
export default async function PortalSettingsPage({ params, searchParams }: PageProps<"/clients/[id]/portal">) {
  const [{ id }, { ig }, me, t] = await Promise.all([params, searchParams, requireProfile(), getTranslations("portalSettings")]);
  const data = await getClient(id);
  if (!data) notFound();
  const canManage = me.role === "admin" || data.members.some((m) => m.profile.id === me.id && m.role === "manager");
  if (!canManage) notFound();

  const [supabase, invoiceAccess] = await Promise.all([createClient(), getInvoiceAccess()]);
  const [{ data: portal }, { data: people }, { data: activity }, { data: instagram }] = await Promise.all([
    supabase.from("client_portals").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("portal_people").select("id, label, email, can_approve").eq("client_id", id).order("created_at"),
    supabase.from("portal_activity").select("id, message, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(12),
    supabase.from("instagram_accounts").select("username, synced_at, sync_error").eq("client_id", id).maybeSingle(),
  ]);

  const url = portal ? `${env.siteUrl}/p/${portal.token}` : null;

  return (
    <div className="flex flex-col">
      <ClientHeader client={data.client} active="portal" canManage={canManage} invoices={invoiceAccess.finance || invoiceAccess.clientIds.includes(id)} />
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-6 lg:px-10">
        <h2 className="display text-[22px] leading-[1.1] lg:text-[26px]">{t("title")}</h2>
        {portal?.enabled && url && (
          <a href={url} target="_blank" rel="noreferrer" className={buttonClass({ size: "sm", variant: "secondary" })}>
            {t("open")} ↗
          </a>
        )}
      </div>
      <div className="max-w-[760px] px-5 pb-5 pt-5 lg:px-10">
        <InstagramPanel clientId={id} account={instagram} status={typeof ig === "string" ? ig : null} />
      </div>
      <PortalSettings
        clientId={id}
        url={url}
        portal={
          portal ?? { enabled: false, show_schedule: true, show_shoots: true, show_scripts: true, show_review: true, show_report: true, locale: "sr" }
        }
        people={people ?? []}
        activity={(activity ?? []).map((a) => ({ id: a.id, message: a.message, when: `${formatDate(a.created_at.slice(0, 10))} ${a.created_at.slice(11, 16)}` }))}
      />
    </div>
  );
}
