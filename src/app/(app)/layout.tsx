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
import { SIDEBAR_COOKIE } from "@/lib/theme";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, cookieStore, lookups] = await Promise.all([requireProfile(), cookies(), getLookups()]);

  return (
    <div className="snf-canvas flex min-h-dvh text-ink">
      <Sidebar profile={profile} initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"} />
      <main className="flex min-w-0 flex-1 flex-col pb-[84px] lg:pb-0">
        <MobileTopBar profile={profile} />
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
