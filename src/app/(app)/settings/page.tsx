import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { requireProfile } from "@/lib/auth";
import type { Preference } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettings, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [me, t] = await Promise.all([requireProfile(), getTranslations("settings")]);
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("event_type, channel, enabled").eq("user_id", me.id);

  return (
    <>
      <PageHeader title={t("title")} newTask={false} />
      <div className="flex max-w-[760px] flex-col gap-10 px-5 pb-[120px] lg:px-10 lg:pb-12">
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("profile")}</h2>
          <ProfileForm profile={me} />
        </section>
        <section className="flex flex-col gap-3.5">
          <h2 className="display text-[20px]">{t("notifications")}</h2>
          <p className="text-[14px] text-ink2">{t("notificationsLead")}</p>
          <NotificationSettings prefs={(data ?? []) as Preference[]} />
        </section>
      </div>
    </>
  );
}
