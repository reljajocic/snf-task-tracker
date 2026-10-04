import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { PriorityMark, StatusDot, dueTone } from "@/components/tasks/bits";
import { ListFilters } from "@/components/tasks/ListFilters";
import { TaskLink } from "@/components/tasks/links";
import { TaskCardMobile } from "@/components/tasks/rows";
import { AvatarStack } from "@/components/ui/Avatar";
import { getLookups, getTasks } from "@/lib/data";
import { formatDate, today as getToday } from "@/lib/dates";
import { byDue } from "@/lib/tasks";

const GRID =
  "grid grid-cols-[minmax(0,1fr)_130px_60px_100px_120px] gap-3.5 xl:grid-cols-[minmax(0,1fr)_140px_110px_80px_100px_130px_120px]";

const TONE = { late: "bg-red-bg text-red-ink", today: "bg-rust-bg text-rust-ink", normal: "bg-chip text-ink" };

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
      <PageHeader title={t("list.title")} eyebrow={t("task.count", { count: rows.length })} />
      <Suspense>
        <ListFilters people={lookups.people} clients={lookups.clients} />
      </Suspense>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 px-5 pb-[120px] lg:hidden">
        {rows.map((x) => (
          <TaskCardMobile key={x.id} task={x} today={today} />
        ))}
        {!rows.length && <p className="py-12 text-center text-[15px] text-ink3">{t("list.empty")}</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden px-10 pb-10 lg:block">
        <div className={`${GRID} sticky top-0 z-[1] border-b border-line bg-side px-4 pb-2.5 pt-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink3`}>
          <span>{t("list.col.task")}</span>
          <span>{t("list.col.client")}</span>
          <span className="hidden xl:block">{t("task.fields.type")}</span>
          <span>{t("list.col.assigned")}</span>
          <span>{t("list.col.priority")}</span>
          <span className="hidden xl:block">{t("list.col.status")}</span>
          <Link href={sortHref} scroll={false} className="justify-self-start text-ink">
            {asc ? t("list.sortAsc") : t("list.sortDesc")}
          </Link>
        </div>
        {rows.map((x) => {
          const done = x.status === "done";
          return (
            <TaskLink key={x.id} id={x.id} className={`${GRID} items-center border-b border-line px-4 py-3 hover:bg-chip ${done ? "opacity-60" : ""}`}>
              <span className={`truncate text-[15px] font-medium leading-snug ${done ? "line-through" : ""}`}>{x.title}</span>
              <span className="truncate text-[14px] leading-tight text-ink2">{x.client?.name ?? t("task.noClient")}</span>
              <span className="hidden truncate text-[14px] leading-tight text-ink2 xl:block">{x.type ? t(`taskType.${x.type}`) : "—"}</span>
              <AvatarStack people={x.assignees} size={26} ring="var(--bg)" />
              <PriorityMark priority={x.priority} />
              <span className="hidden xl:block">
                <StatusDot status={x.status} />
              </span>
              {x.due_date ? (
                <span className={`justify-self-start whitespace-nowrap rounded-[5px] px-[9px] py-1.5 text-[13px] font-semibold leading-none ${TONE[dueTone(x, today)]}`}>
                  {formatDate(x.due_date)}
                </span>
              ) : (
                <span className="text-[13px] text-ink3">—</span>
              )}
            </TaskLink>
          );
        })}
        {!rows.length && <div className="px-4 py-12 text-center text-[15px] text-ink3">{t("list.empty")}</div>}
      </div>
    </>
  );
}
