import { getTranslations } from "next-intl/server";

export default async function PortalNotFound() {
  const t = await getTranslations("portal");
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-4 bg-ink-black px-7 text-offwhite lg:px-24">
      <img src="/brand/logo-off-white.png" alt="Slate 'n' Frame" className="h-7" />
      <h1 className="display text-[34px] lg:text-[48px]">{t("notFoundTitle")}</h1>
      <p className="max-w-[460px] text-[16px] leading-relaxed text-offwhite/70">{t("notFoundText")}</p>
    </div>
  );
}
