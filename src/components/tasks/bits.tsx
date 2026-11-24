// Small presentational pieces shared by every task view. No state, safe in server and client trees.
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { DueLabel, IsoDate } from "@/lib/dates";
import { PRIORITY_COLOR, isDone, taskOverdue, type Task, type TaskPriority } from "@/lib/tasks";

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
