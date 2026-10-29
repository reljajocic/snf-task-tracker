import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClientMark } from "@/components/ClientMark";
import { BackLink } from "@/components/shell/PageTitle";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { CLIENT_STATUS_COLOR, type Client } from "@/lib/clients";
import { safeHref } from "@/lib/safe-url";

export type ClientTab = "overview" | "portal" | "reports";

/**
 * Every page of a client starts the same: who it is, its tabs (overview, the portal the client sees, the monthly
 * report) and one row of links to its content elsewhere in the app (bank, shoots, schedule, invoices, Drive).
 */
export async function ClientHeader({ client, active, canManage, invoices }: { client: Client; active: ClientTab; canManage: boolean; invoices: boolean }) {
  const t = await getTranslations();
  const base = `/clients/${client.id}`;
  const tabs = [
    { key: "overview", label: t("clients.tabOverview"), href: base, active: active === "overview" },
    ...(canManage ? [{ key: "portal", label: t("clients.tabPortal"), href: `${base}/portal`, active: active === "portal" }] : []),
    { key: "reports", label: t("report.title"), href: `${base}/reports`, active: active === "reports" },
  ];
  const links = [
    { href: `/content/videos?client=${client.id}`, label: t("nav.videos") },
    { href: `/content/shoots?client=${client.id}`, label: t("nav.shoots") },
    { href: `/content/schedule?client=${client.id}`, label: t("nav.schedule") },
    ...(invoices ? [{ href: `/invoices?client=${client.id}`, label: t("nav.invoices") }] : []),
  ];
  const drive = safeHref(client.drive_url);

  return (
    <header className="flex flex-col gap-5 border-b border-line px-5 pb-5 pt-6 lg:px-10 lg:pt-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3.5">
          <BackLink href="/clients" label={t("nav.clients")} />
          <div className="flex items-center gap-4">
            <ClientMark client={client} size={52} />
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="display text-[32px] leading-[1] lg:text-[44px]">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-[7px] whitespace-nowrap rounded-full border border-line2 px-2.5 py-1.5 text-[13px] font-medium leading-none">
                  <span className="size-2 rounded-full" style={{ background: CLIENT_STATUS_COLOR[client.status] }} />
                  {t(`clientStatus.${client.status}`)}
                </span>
                {client.services.map((s) => (
                  <span key={s} className="whitespace-nowrap rounded-full bg-chip px-2.5 py-1.5 text-[13px] font-medium leading-none text-ink2">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href={`${base}/edit`} className={buttonClass({ size: "sm", variant: "secondary" })}>
              {t("clients.edit")}
            </Link>
          )}
          <Link href={`${base}?new=1&client=${client.id}`} scroll={false} className={buttonClass({ size: "sm", className: "hidden lg:inline-flex" })}>
            {t("common.newTask")}
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Segmented items={tabs} scroll />
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-medium">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink2 hover:text-ink">
              {l.label} <span className="text-ink3">↗</span>
            </Link>
          ))}
          {drive && (
            <a href={drive} target="_blank" rel="noreferrer" className="text-ink2 hover:text-ink">
              {t("clients.drive")} <span className="text-ink3">↗</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
