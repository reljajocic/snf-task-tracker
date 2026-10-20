import { AutoRefresh } from "@/components/AutoRefresh";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { MobileNav } from "@/components/shell/MobileNav";
import { MobileTopBar } from "@/components/shell/MobileTopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { NewTaskFab } from "@/components/tasks/links";
import { TaskOverlays } from "@/components/tasks/TaskOverlays";
import { DialogHost } from "@/components/ui/Dialog";
import { requireProfile } from "@/lib/auth";
import { getLookups } from "@/lib/data";
import { getInvoiceAccess } from "@/lib/finance";
import { today } from "@/lib/dates";
import { SIDEBAR_COOKIE } from "@/lib/theme";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, cookieStore, lookups, invoiceAccess] = await Promise.all([requireProfile(), cookies(), getLookups(), getInvoiceAccess()]);

  return (
    <div className="snf-canvas snf-app flex min-h-dvh text-ink">
      <Sidebar profile={profile} initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"} invoices={invoiceAccess.any} />
      {/* Others' changes show up on their own (every minute, and when you come back to the tab). */}
      <AutoRefresh seconds={60} />
      <main className="flex min-w-0 flex-1 flex-col pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0">
        <MobileTopBar profile={profile} invoices={invoiceAccess.any} />
        {children}
      </main>
      <MobileNav admin={profile.role === "admin"} />
      <DialogHost />
      <Suspense>
        {profile.role !== "admin" && <NewTaskFab />}
        <TaskOverlays lookups={lookups} today={today()} />
      </Suspense>
    </div>
  );
}
