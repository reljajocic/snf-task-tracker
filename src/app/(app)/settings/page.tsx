import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { requireProfile } from "@/lib/auth";
import { parseLocale } from "@/lib/locale";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { cookies } from "next/headers";
import type { Preference } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { AiKeys, type ApiKey } from "./AiKeys";
import { LanguageSetting, NotificationSettings, ProfileForm, ThemeSetting } from "./SettingsForms";

export default async function SettingsPage() {
  const [me, t, locale] = await Promise.all([requireProfile(), getTranslations("settings"), getLocale()]);
  const supabase = await createClient();
  const [{ data }, { data: keys }] = await Promise.all([
    supabase.from("notification_preferences").select("event_type, channel, enabled").eq("user_id", me.id),
    supabase.from("api_tokens").select("id, name, created_at, last_used_at").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title={t("title")} newTask={false} />
      <div className="flex max-w-[760px] flex-col gap-10 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("profile")}</h2>
          <ProfileForm profile={me} />
        </section>
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("appearance")}</h2>
          <p className="text-[14px] text-ink2">{t("appearanceHint")}</p>
          <ThemeSetting current={parseTheme((await cookies()).get(THEME_COOKIE)?.value)} />
        </section>
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("language")}</h2>
          <p className="text-[14px] text-ink2">{t("languageHint")}</p>
          <LanguageSetting current={parseLocale(locale)} />
        </section>
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("notifications")}</h2>
          <p className="text-[14px] text-ink2">{t("notificationsLead")}</p>
          <NotificationSettings prefs={(data ?? []) as Preference[]} />
        </section>
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("ai.title")}</h2>
          <p className="text-[14px] text-ink2">{t("ai.lead")}</p>
          <AiKeys keys={(keys ?? []) as ApiKey[]} />
        </section>
      </div>
    </>
  );
}
