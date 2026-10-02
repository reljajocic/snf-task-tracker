import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { requireAdmin, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./InviteForm";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdmin();
  const t = await getTranslations("team");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, initials, avatar_bg, avatar_fg, role, theme, is_active")
    .order("full_name");
  const people = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader title={t("title")} eyebrow={t("eyebrow", { count: people.length })} newTask={false} />
      <div className="flex max-w-[960px] flex-col gap-10 px-5 pb-12 lg:px-10">
        <ul className="flex flex-col border-t border-line">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-4 border-b border-line py-3.5">
              <Avatar person={p} size={32} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[15px] font-medium">
                  {p.full_name}
                  {p.id === me.id && <span className="ml-2 text-[13px] text-ink3">· {t("you")}</span>}
                </span>
                <span className="truncate text-[13px] text-ink3">{p.email}</span>
              </div>
              {!p.is_active && <span className="text-[12px] text-ink3">{t("inactive")}</span>}
              <span className="rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink2">
                {p.role === "admin" ? t("roleAdmin") : t("roleUser")}
              </span>
            </li>
          ))}
        </ul>
        <InviteForm />
      </div>
    </>
  );
}
