import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { getPortal } from "@/lib/portal";
import PortalNotFound from "./not-found";
import { PortalLang } from "./PortalLang";
import { PortalNav, type PortalTab } from "./PortalNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// 7a header: logo × client name, tabs (underlined active), same tabs at the bottom on mobile.
export default async function PortalLayout({ children, params }: LayoutProps<"/p/[token]">) {
  const { token } = await params;
  const portal = await getPortal(token);
  // Unknown or disabled link: a branded dead end (no hint whether the client exists).
  if (!portal) return <PortalNotFound />;
  const [t, messages] = await Promise.all([getTranslations({ locale: portal.locale, namespace: "portal.nav" }), getMessages({ locale: portal.locale })]);
  const base = `/p/${token}`;
  const tabs = [
    { href: base, label: t("home"), icon: "home", exact: true },
    portal.show.schedule && { href: `${base}/schedule`, label: t("schedule"), icon: "schedule" },
    (portal.show.shoots || portal.show.scripts) && { href: `${base}/shoots`, label: t("shoots"), icon: "shoots" },
    portal.show.report && { href: `${base}/reports`, label: t("reports"), icon: "list" },
  ].filter(Boolean) as PortalTab[];

  return (
    <div className="snf-canvas flex min-h-dvh flex-col text-ink">
      <header className="flex h-16 items-center gap-10 border-b border-line px-5 lg:h-[72px] lg:px-12">
        <div className="flex min-w-0 items-center gap-3.5">
          <img src="/brand/logo-off-white.png" alt="Slate 'n' Frame" className="h-5 [filter:var(--logo-filter)] lg:h-6" />
          <span className="text-[16px] text-ink3">×</span>
          <span className="truncate text-[15px] font-semibold">{portal.clientName}</span>
        </div>
        <PortalNav tabs={tabs} variant="top" />
        <div className="ml-auto">
          <PortalLang current={portal.locale} />
        </div>
      </header>
      <NextIntlClientProvider locale={portal.locale} messages={messages}>
        <main className="flex flex-1 flex-col pb-[84px] lg:pb-0">{children}</main>
      </NextIntlClientProvider>
      <PortalNav tabs={tabs} variant="bottom" />
    </div>
  );
}
