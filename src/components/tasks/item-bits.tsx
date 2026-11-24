// One anatomy for every task and video, in every view (window, rows, cards):
//   where it belongs (client, then format and type tags) / title / status / dates (shoot, deadline, posting) / people.
// Facts are kept apart by space and labels, never by a middle dot. Server-safe: translations only, no state.
import { useTranslations } from "next-intl";
import { formatShortDate, weekdayIndex, type IsoDate } from "@/lib/dates";
import { ITEM_STATUS_COLOR, itemStatus, taskDue, type ItemStatus, type Task } from "@/lib/tasks";
import { dueTone, useDueText } from "./bits";
import { PostTags } from "./tags";

/** "Script", "Edit", "Published", "Dropped" for videos; "To do", "In progress"… for tasks. */
export function useItemStatusLabel() {
  const t = useTranslations();
  return (s: ItemStatus) => {
    if (s === "dropped") return t("item.dropped");
    if (s === "todo" || s === "in_progress" || s === "waiting_client" || s === "done") return t(`status.${s}`);
    return t(`phase.${s}`);
  };
}

/** The status as a quiet dot and word, for places that only show it (cards you drag, calendar chips). */
export function StatusLabel({ task, className = "" }: { task: Pick<Task, "kind" | "status" | "phase" | "dropped_at">; className?: string }) {
  const label = useItemStatusLabel();
  const s = itemStatus(task);
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-ink2 ${className}`}>
      <span className="size-2 flex-none rounded-full" style={{ background: ITEM_STATUS_COLOR[s] }} />
      {label(s)}
    </span>
  );
}

/** Where it belongs: the client's name, then the post's format and type as tags (videos). No separators. */
export function ItemWhere({ task, client = true, project = false, className = "" }: { task: Task; client?: boolean; project?: boolean; className?: string }) {
  const t = useTranslations();
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-tight text-ink2 ${className}`}>
      {client && <span className="truncate">{task.client?.name ?? t("task.noClient")}</span>}
      {project && task.project && <span className={`truncate ${client ? "text-ink3" : ""}`}>{task.project.name}</span>}
      {task.kind === "video" ? (
        <PostTags format={task.format} type={task.content_type} formatLabel={t(`format.${task.format}`)} />
      ) : (
        task.type && <span className="text-ink3">{t(`taskType.${task.type}`)}</span>
      )}
    </span>
  );
}

const TONE = { late: "text-red-ink", today: "text-rust-ink", normal: "text-ink" } as const;

/** One date with its name over it. `sub` (relative deadline, weekday) sits under the date. */
function DateCell({ label, date, sub, tone = "normal", className = "" }: { label: string; date: IsoDate | null; sub?: string | null; tone?: keyof typeof TONE; className?: string }) {
  return (
    <span className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[12px] leading-none text-ink3">{label}</span>
      <span className={`whitespace-nowrap text-[13px] font-semibold leading-none ${date ? TONE[tone] : "font-normal text-ink3"}`}>
        {date ? formatShortDate(date) : "—"}
      </span>
      {sub && <span className={`whitespace-nowrap text-[12px] leading-none ${tone === "normal" ? "text-ink3" : TONE[tone]}`}>{sub}</span>}
    </span>
  );
}

/**
 * The dates, always in the same order and the same slots: Shoot, Deadline, Posting. A task only has a deadline; it
 * keeps the middle slot so deadlines line up down a mixed list. `slots={false}` drops the empty ones (cards).
 */
export function ItemDates({ task, today, slots = true, className = "" }: { task: Task; today: IsoDate; slots?: boolean; className?: string }) {
  const t = useTranslations();
  const dueText = useDueText();
  const video = task.kind === "video";
  const due = taskDue(task, today);
  const tone = dueTone(task, today);
  const day = (d: IsoDate | null) => (d ? t("weekday.short", { day: String(weekdayIndex(d)) }) : null);
  const cell = "w-[76px] flex-none";
  const shoot = video ? <DateCell label={t("item.shoot")} date={task.shoot?.date ?? null} sub={day(task.shoot?.date ?? null)} className={cell} /> : null;
  const deadline =
    !video || task.due_date || (task.phase ?? 0) >= 2 ? (
      <DateCell label={t("item.deadline")} date={task.due_date} sub={due ? dueText(due) : null} tone={tone} className={cell} />
    ) : null;
  // A posting date that passed while the video isn't out: red, like a missed deadline.
  const missed = !!task.publish_date && task.publish_date < today && !task.dropped_at && (task.phase ?? 0) < 5;
  const posting = video ? <DateCell label={t("item.posting")} date={task.publish_date} sub={day(task.publish_date)} tone={missed ? "late" : "normal"} className={cell} /> : null;
  const empty = <span className={cell} />;
  if (!slots) {
    const shown = [shoot, deadline, posting].filter(Boolean);
    if (!shown.length) return null;
    return <span className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>{shoot}{deadline}{posting}</span>;
  }
  return (
    <span className={`flex gap-3 ${className}`}>
      {shoot ?? empty}
      {deadline ?? empty}
      {posting ?? empty}
    </span>
  );
}
