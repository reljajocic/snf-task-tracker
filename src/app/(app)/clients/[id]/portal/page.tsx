import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { formatDate } from "@/lib/dates";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PortalSettings } from "./PortalSettings";

// 7d: our screen for configuring a client's portal.
export default async function PortalSettingsPage({ params }: PageProps<"/clients/[id]/portal">) {
  const [{ id }, me, t] = await Promise.all([params, requireProfile(), getTranslations("portalSettings")]);
  const data = await getClient(id);
  if (!data) notFound();
  const canManage = me.role === "admin" || data.members.some((m) => m.profile.id === me.id && m.role === "manager");
  if (!canManage) notFound();

  const supabase = await createClient();
  const [{ data: portal }, { data: people }, { data: activity }] = await Promise.all([
    supabase.from("client_portals").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("portal_people").select("id, label, email, can_approve").eq("client_id", id).order("created_at"),
    supabase.from("portal_activity").select("id, message, created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(12),
  ]);

  const url = portal ? `${env.siteUrl}/p/${portal.token}` : null;

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-4 px-5 pb-5 pt-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pt-7">
        <div className="flex flex-col gap-3.5">
          <Link href={`/clients/${id}`} className="text-[14px] font-medium text-ink3 hover:text-ink">
            ‹ {data.client.name}
          </Link>
          <h1 className="display text-[32px] lg:text-[44px]">{t("title")}</h1>
        </div>
        {portal?.enabled && url && (
          <a href={url} target="_blank" rel="noreferrer" className="flex h-[42px] items-center self-start rounded-[7px] border border-line2 px-4 text-[14px] font-medium lg:self-auto">
            {t("open")}
          </a>
        )}
      </header>
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
