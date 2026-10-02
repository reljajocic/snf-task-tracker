import { cookies } from "next/headers";
import { Suspense } from "react";
import { MobileNav } from "@/components/shell/MobileNav";
import { MobileTopBar } from "@/components/shell/MobileTopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { NewTaskFab } from "@/components/tasks/links";
import { TaskOverlays } from "@/components/tasks/TaskOverlays";
import { requireProfile } from "@/lib/auth";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { SIDEBAR_COOKIE, THEME_COOKIE, parseTheme } from "@/lib/theme";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, cookieStore, lookups] = await Promise.all([requireProfile(), cookies(), getLookups()]);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <Sidebar profile={profile} theme={theme} initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"} />
      <main className="flex min-w-0 flex-1 flex-col pb-[84px] lg:pb-0">
        <MobileTopBar profile={profile} theme={theme} />
        {children}
      </main>
      <MobileNav />
      <Suspense>
        <NewTaskFab />
        <TaskOverlays lookups={lookups} today={today()} />
      </Suspense>
    </div>
  );
}
