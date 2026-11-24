// Task and video rows and cards for Home, the task list, the client page and the calendar. Every one is laid out
// the same way (see item-bits): title, where it belongs, status, dates (shoot, deadline, posting), people.
// The title is the link that opens the item; it stretches over the whole row, and the status button sits above it,
// so the status changes in place without opening anything.
import { useTranslations } from "next-intl";
import { AvatarStack } from "@/components/ui/Avatar";
import { daysBetween, type IsoDate } from "@/lib/dates";
import type { Task } from "@/lib/tasks";
import { PriorityMark, dueTone } from "./bits";
import { ItemDates, ItemWhere } from "./item-bits";
import { TaskLink } from "./links";
import { StatusMenu } from "./StatusMenu";

/**
 * Title | status | dates | people. Shared by every desktop list so the same thing sits in the same column. Rows
 * measure their own width: in a narrow column (Home beside its sidebar) status and dates go on a second line.
 */
export const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_150px_252px_84px] items-center gap-5";

// The title's link covers its row or card; its focus ring is drawn on that whole area (and not again on the text).
const stretched = "outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:shadow-none focus-visible:after:shadow-[inset_0_0_0_2px_var(--accent)]";

/** Where it belongs, with the priority when it isn't the usual Medium. */
function WhereLine({ task, client = true }: { task: Task; client?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <ItemWhere task={task} client={client} project={!client} />
      {task.priority !== "medium" && <PriorityMark priority={task.priority} />}
    </span>
  );
}

/** Desktop row (design 1a), in a surface list or the task list table. */
export function TaskRow({ task, today, inClient = false }: { task: Task; today: IsoDate; /** On the client's own page: its name is the title, so the project shows instead. */ inClient?: boolean }) {
  const late = dueTone(task, today) === "late";
  const done = task.status === "done";
  return (
    <div className={`@container relative hover:bg-hover ${late ? "bg-red-bg hover:bg-red-bg" : ""}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 px-[18px] py-3.5 @[720px]:grid-cols-[minmax(0,1fr)_150px_252px_84px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <TaskLink id={task.id} className={`line-clamp-2 text-[15px] font-medium leading-snug ${done ? "text-ink2 line-through" : ""} ${stretched}`}>
            {task.title}
          </TaskLink>
          <WhereLine task={task} client={!inClient} />
        </div>
        <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-5 gap-y-2 @[720px]:contents">
          <span className="relative justify-self-start">
            <StatusMenu task={task} today={today} size="sm" />
          </span>
          <ItemDates task={task} today={today} />
        </div>
        <span className="col-start-2 row-start-1 justify-self-end self-start @[720px]:col-start-4 @[720px]:self-center">
          <AvatarStack people={task.assignees} size={28} />
        </span>
      </div>
    </div>
  );
}

export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="snf-stack">{children}</div>;
}

/** Phone card: the same pieces stacked. `compact` for long lists (smaller title, no dates). */
export function TaskCardMobile({ task, today, compact = false }: { task: Task; today: IsoDate; compact?: boolean }) {
  const late = dueTone(task, today) === "late";
  const done = task.status === "done";
  return (
    <div className={`relative flex flex-col gap-3 rounded-lg border bg-surf ${compact ? "px-4 py-3.5" : "p-4"} ${late ? "border-red-line" : "border-line"}`}>
      <div className="flex justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <TaskLink id={task.id} className={`${compact ? "text-[16px]" : "text-[18px]"} font-medium leading-snug ${done ? "text-ink2 line-through" : ""} ${stretched}`}>
            {task.title}
          </TaskLink>
          <WhereLine task={task} />
        </div>
        <AvatarStack people={task.assignees} size={30} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="relative">
          <StatusMenu task={task} today={today} size="sm" />
        </span>
        {!compact && <ItemDates task={task} today={today} slots={false} />}
      </div>
    </div>
  );
}

/** Compact phone row (design 1b "This week"). */
export function TaskRowMobile({ task, today }: { task: Task; today: IsoDate }) {
  return <TaskCardMobile task={task} today={today} compact />;
}

/** "Waiting on client" card: the usual card, plus how long it's been waiting. */
export function WaitingCard({ task, today, large = false }: { task: Task; today: IsoDate; large?: boolean }) {
  const t = useTranslations();
  const days = Math.max(0, daysBetween(task.status_changed_at.slice(0, 10), today));
  return (
    <div className={`relative flex flex-col gap-2.5 rounded-lg border border-line bg-surf ${large ? "p-4" : "px-4 py-3.5"}`}>
      <div className="flex justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <TaskLink id={task.id} className={`${large ? "text-[16px]" : "text-[15px]"} font-medium leading-snug ${stretched}`}>
            {task.title}
          </TaskLink>
          <ItemWhere task={task} />
        </div>
        <AvatarStack people={task.assignees} size={26} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusMenu task={task} today={today} size="sm" />
          <span className="text-[13px] font-semibold text-[var(--waiting-ink)]">{t("task.waitingFor", { days })}</span>
        </span>
        <ItemDates task={task} today={today} slots={false} />
      </div>
    </div>
  );
}
