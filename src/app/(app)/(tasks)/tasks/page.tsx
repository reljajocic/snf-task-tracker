import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ListFilters } from "@/components/tasks/ListFilters";
import { ROW_GRID, TaskCardMobile, TaskRow } from "@/components/tasks/rows";
import { getLookups, getTasks } from "@/lib/data";
import { today as getToday } from "@/lib/dates";
import { byDue } from "@/lib/tasks";
import { TaskPhoneBar } from "../TaskViewTabs";

// 5a / 5b
export default async function TaskListPage({ searchParams }: PageProps<"/tasks">) {
  const [params, lookups, t] = await Promise.all([searchParams, getLookups(), getTranslations()]);
  const p = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : null);
  const showDone = p("done") === "1" || p("status") === "done";
  const tasks = await getTasks({ includeDone: showDone });
  const today = getToday();
  const asc = p("sort") !== "desc";

  const rows = tasks
    .filter((x) => !p("who") || x.assignees.some((a) => a.id === p("who")))
    .filter((x) => !p("client") || (p("client") === "none" ? !x.client : x.client?.id === p("client")))
    .filter((x) => (p("status") ? x.status === p("status") : showDone || x.status !== "done"))
    .filter((x) => !p("priority") || x.priority === p("priority"))
    .filter((x) => !p("type") || x.type === p("type"))
    .sort((a, b) => (asc ? byDue(a, b) : byDue(b, a)));

  const sortHref = (() => {
    const next = new URLSearchParams(Object.entries(params).filter(([, v]) => typeof v === "string") as [string, string][]);
    if (asc) next.set("sort", "desc");
    else next.delete("sort");
    next.delete("task");
    const qs = next.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  })();

  return (
    <>
      <PageHeader title={t("list.title")} eyebrow={t("task.count", { count: rows.length })} phone="none" />
      <TaskPhoneBar />
      <Suspense>
        <ListFilters people={lookups.people} clients={lookups.clients} />
      </Suspense>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:hidden">
        {rows.map((x) => (
          <TaskCardMobile key={x.id} task={x} today={today} />
        ))}
        {!rows.length && <p className="py-12 text-center text-[15px] text-ink3">{t("list.empty")}</p>}
      </div>

      {/* Desktop table: the same rows as everywhere (title, status, dates, people), under column names. */}
      <div className="hidden px-10 pb-10 lg:block">
        <div className="@container sticky top-0 z-[1] border-b border-line bg-side">
          <div className={`${ROW_GRID} hidden px-[18px] pb-2.5 pt-3.5 text-[13px] font-medium leading-none text-ink3 @[720px]:grid`}>
            <span>{t("list.col.task")}</span>
            <span>{t("list.col.status")}</span>
            {/* Over the middle slot, where the deadline sits. */}
            <Link href={sortHref} scroll={false} className="justify-self-start pl-[88px] text-ink hover:underline">
              {asc ? t("list.sortAsc") : t("list.sortDesc")}
            </Link>
            <span className="justify-self-end">{t("list.col.assigned")}</span>
          </div>
        </div>
        <div className="flex flex-col divide-y divide-line border-b border-line">
          {rows.map((x) => (
            <TaskRow key={x.id} task={x} today={today} />
          ))}
        </div>
        {!rows.length && <div className="px-4 py-12 text-center text-[15px] text-ink3">{t("list.empty")}</div>}
      </div>
    </>
  );
}
