// Task rows and cards for Home, List and Calendar. Server-safe (no hooks besides translations);
// each item is wrapped in a TaskLink that opens the detail panel.
import { useTranslations } from "next-intl";
import { AvatarStack } from "@/components/ui/Avatar";
import { daysBetween, formatDate, type IsoDate } from "@/lib/dates";
import type { Task } from "@/lib/tasks";
import { DueStack, PriorityMark, PrioritySquare, TaskFacts, TaskMeta, dueTone, useDueText } from "./bits";
import { TaskLink } from "./links";
import { taskDue } from "@/lib/tasks";

// The title gets the width: client, type, status and priority sit on one line under it (status and priority only
// when they aren't the usual To do / Medium), so the row is title | people | deadline.
const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_96px_118px] items-center gap-5";

/** Desktop row inside a surface list (design 1a). `plainDate`: under a day header, so the date isn't repeated. */
export function TaskRow({ task, today, plainDate = false }: { task: Task; today: IsoDate; plainDate?: boolean }) {
  const t = useTranslations();
  const late = dueTone(task, today) === "late";
  return (
    <TaskLink
      id={task.id}
      className={`${ROW_GRID} border-t border-line px-[18px] py-3.5 first:border-t-0 hover:bg-hover ${late && !plainDate ? "bg-red-bg hover:bg-red-bg" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[15px] font-medium leading-snug">{task.title}</span>
        <TaskFacts
          parts={[task.client?.name ?? t("task.noClient"), task.type ? t(`taskType.${task.type}`) : null]}
          status={task.status}
          priority={task.priority}
        />
      </div>
      <span className="justify-self-end">
        <AvatarStack people={task.assignees} size={28} />
      </span>
      {plainDate ? <span /> : <DueStack task={task} today={today} />}
    </TaskLink>
  );
}

export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="snf-stack">{children}</div>;
}

/** Mobile card with relative deadline and priority (design 1b "Danas i zakasnelo"). */
export function TaskCardMobile({ task, today }: { task: Task; today: IsoDate }) {
  const dueText = useDueText();
  const label = taskDue(task, today);
  const tone = dueTone(task, today);
  const toneClass = tone === "late" ? "bg-red-bg text-red-ink" : tone === "today" ? "bg-rust-bg text-rust-ink" : "bg-chip text-ink2";
  return (
    <TaskLink
      id={task.id}
      className={`flex flex-col gap-3 rounded-lg border bg-surf p-4 ${tone === "late" ? "border-red-line" : "border-line"}`}
    >
      <div className="flex justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[18px] font-medium leading-snug">{task.title}</span>
          <TaskMeta task={task} />
        </div>
        <AvatarStack people={task.assignees} size={30} />
      </div>
      <div className="flex items-center justify-between gap-2">
        {label && task.due_date ? (
          <div className={`flex items-center gap-2 rounded-md px-2.5 py-2 ${toneClass}`}>
            <span className="whitespace-nowrap text-[15px] font-bold leading-none">{dueText(label)}</span>
            <span className="whitespace-nowrap text-[13px] leading-none text-ink2">{formatDate(task.due_date)}</span>
          </div>
        ) : (
          <span />
        )}
        <PriorityMark priority={task.priority} />
      </div>
    </TaskLink>
  );
}

/** Compact mobile row (design 1b "Ove nedelje"). */
export function TaskRowMobile({ task }: { task: Task }) {
  const t = useTranslations("task");
  return (
    <TaskLink id={task.id} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surf px-4 py-3.5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[16px] font-medium leading-snug">{task.title}</span>
        <span className="flex items-center gap-[7px] text-[13px] leading-tight text-ink2">
          <PrioritySquare priority={task.priority} />
          {task.client?.name ?? t("noClient")}
        </span>
      </div>
      <AvatarStack people={task.assignees} size={30} />
    </TaskLink>
  );
}

/** "Waiting on client" card: how long it's been waiting + deadline. */
export function WaitingCard({ task, today, large = false }: { task: Task; today: IsoDate; large?: boolean }) {
  const t = useTranslations();
  const days = Math.max(0, daysBetween(task.status_changed_at.slice(0, 10), today));
  return (
    <TaskLink
      id={task.id}
      className={`flex flex-col gap-2.5 border border-line bg-surf ${large ? "rounded-lg p-4" : "rounded-lg px-4 py-3.5"}`}
    >
      <div className="flex justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[5px]">
          <span className={`${large ? "text-[16px]" : "text-[15px]"} font-medium leading-snug`}>{task.title}</span>
          <span className="text-[13px] leading-tight text-ink2">{task.client?.name ?? t("task.noClient")}</span>
        </div>
        {!large && <AvatarStack people={task.assignees} size={26} />}
      </div>
      <div className={`flex justify-between whitespace-nowrap font-medium leading-none ${large ? "text-[14px] font-semibold" : "text-[13px]"}`}>
        <span className="text-[var(--waiting-ink)]">{t("task.waitingFor", { days })}</span>
        {task.due_date && <span className="font-normal text-ink3">{t("home.dueShort", { date: formatDate(task.due_date) })}</span>}
      </div>
    </TaskLink>
  );
}

