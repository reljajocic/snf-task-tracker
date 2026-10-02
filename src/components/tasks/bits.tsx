// Small presentational pieces shared by every task view. No state, safe in server and client trees.
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatDate, formatShortDate, type DueLabel, type IsoDate } from "@/lib/dates";
import { PRIORITY_COLOR, STATUS_COLOR, isDone, taskDue, taskOverdue, type Task, type TaskPriority, type TaskStatus } from "@/lib/tasks";

/** Selected pill = solid "seg" colors; unselected = hairline outline (design `chip()`). */
export function chipClass(selected: boolean, extra = "") {
  return [
    "inline-flex items-center gap-2 whitespace-nowrap rounded-full border font-medium cursor-pointer transition-colors duration-[var(--dur-fast)] disabled:cursor-default",
    selected ? "border-seg bg-seg text-seg-ink" : "border-line2 bg-transparent text-ink2 hover:text-ink",
    extra,
  ].join(" ");
}

export function Pill({
  selected,
  onClick,
  children,
  size = "md",
  disabled,
}: {
  selected: boolean;
  onClick?: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const sz = size === "sm" ? "h-[30px] px-2.5 text-[12px]" : size === "lg" ? "h-[38px] px-3.5 text-[14px]" : "h-[34px] px-3 text-[13px]";
  return (
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={chipClass(selected, sz)}>
      {children}
    </button>
  );
}

export function PriorityMark({ priority, label = true }: { priority: TaskPriority; label?: boolean }) {
  const t = useTranslations("priority");
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-ink2">
      <span className="size-[9px] shrink-0 rounded-[2px]" style={{ background: PRIORITY_COLOR[priority] }} />
      {label && t(priority)}
    </span>
  );
}

export function PrioritySquare({ priority }: { priority: TaskPriority }) {
  return <span className="size-2 shrink-0 rounded-[2px]" style={{ background: PRIORITY_COLOR[priority] }} />;
}

export function StatusDot({ status, label = true }: { status: TaskStatus; label?: boolean }) {
  const t = useTranslations("status");
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-ink2">
      <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {label && t(status)}
    </span>
  );
}

/** "3 days overdue", "Today", "Thursday", "In 9 days", "Done". */
export function useDueText() {
  const t = useTranslations();
  return (label: DueLabel) => {
    switch (label.kind) {
      case "done":
        return t("due.done");
      case "overdue":
        return t("due.overdue", { days: label.days });
      case "today":
        return t("due.today");
      case "tomorrow":
        return t("due.tomorrow");
      case "weekday":
        return t("weekday.long", { day: String(label.weekday) });
      case "inDays":
        return t("due.inDays", { days: label.days });
    }
  };
}

export function dueTone(task: Task, today: IsoDate): "late" | "today" | "normal" {
  if (taskOverdue(task, today)) return "late";
  if (task.due_date === today && !isDone(task)) return "today";
  return "normal";
}

const TONE: Record<ReturnType<typeof dueTone>, string> = {
  late: "bg-red-bg text-red-ink",
  today: "bg-rust-bg text-rust-ink",
  normal: "bg-chip text-ink2",
};

/** Two-line deadline block used in rows: relative label over the date. */
export function DueStack({ task, today }: { task: Task; today: IsoDate }) {
  const dueText = useDueText();
  const t = useTranslations("task");
  const label = taskDue(task, today);
  const tone = dueTone(task, today);
  if (!label || !task.due_date) {
    return <span className="justify-self-end px-2.5 text-[13px] text-ink3">{t("noDue")}</span>;
  }
  return (
    <div className={`flex min-w-[118px] flex-col items-start gap-1 justify-self-end rounded-[5px] px-2.5 py-[7px] ${TONE[tone]}`}>
      <span className="whitespace-nowrap text-[13px] font-semibold leading-none">{dueText(label)}</span>
      <span className="whitespace-nowrap text-[12px] leading-none text-ink2">{formatDate(task.due_date)}</span>
    </div>
  );
}

/** Compact deadline chip for cards: "2 days overdue · 30.09." / "Today" / "05.10.2026". */
export function DueChip({ task, today }: { task: Task; today: IsoDate }) {
  const dueText = useDueText();
  const label = taskDue(task, today);
  if (!label || !task.due_date) return <span />;
  const tone = dueTone(task, today);
  const text =
    tone === "late"
      ? `${dueText(label)} · ${formatShortDate(task.due_date)}`
      : tone === "today"
        ? dueText(label)
        : formatDate(task.due_date);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-[5px] px-2 py-1.5 text-[12px] font-semibold leading-none ${TONE[tone]}`}>
      {text}
    </span>
  );
}

/** "Client · Type" line under a task title. */
export function TaskMeta({ task }: { task: Task }) {
  const t = useTranslations();
  const parts = [task.client?.name ?? t("task.noClient")];
  if (task.type) parts.push(t(`taskType.${task.type}`));
  return <span className="text-[13px] leading-tight text-ink2">{parts.join(" · ")}</span>;
}

/** Uppercase eyebrow tag (design "oznaka tipa"). */
export function TypeTag({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-ink2">
      {children}
    </span>
  );
}
