import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { MobileNav } from "@/components/shell/MobileNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { requireProfile } from "@/lib/auth";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, cookieStore, t] = await Promise.all([
    requireProfile(),
    cookies(),
    getTranslations("common"),
  ]);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <Sidebar profile={profile} theme={theme} />
      <main className="flex min-w-0 flex-1 flex-col pb-[84px] lg:pb-0">{children}</main>
      <MobileNav />
      {/* Mobile "new task" FAB: 64×64, 20px from the right, 100px from the bottom */}
      <button
        type="button"
        aria-label={t("newTask")}
        className="fixed bottom-[100px] right-5 z-30 flex size-16 cursor-pointer items-center justify-center rounded-full bg-accent text-[30px] font-light text-charcoal shadow-[0_10px_30px_rgba(0,0,0,0.35)] lg:hidden"
      >
        +
      </button>
    </div>
  );
}
