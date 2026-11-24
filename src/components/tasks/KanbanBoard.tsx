"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { updateTask } from "@/app/(app)/task-actions";
import { AvatarStack } from "@/components/ui/Avatar";
import type { IsoDate } from "@/lib/dates";
import { STATUSES, STATUS_COLOR, byDue, type Task, type TaskStatus } from "@/lib/tasks";
import { dueTone } from "./bits";
import { ItemDates, ItemWhere, StatusLabel } from "./item-bits";
import { TaskLink } from "./links";
import { Segmented } from "@/components/ui/Segmented";

function KanbanCard({ task, today, mobile = false }: { task: Task; today: IsoDate; mobile?: boolean }) {
  const t = useTranslations();
  const late = dueTone(task, today) === "late";
  const done = task.status === "done";
  return (
    <TaskLink
      id={task.id}
      draggable={!mobile}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`flex flex-col border bg-surf ${mobile ? "gap-[11px] rounded-lg p-4" : "cursor-grab gap-[11px] rounded-lg p-3.5 active:cursor-grabbing"} ${
        late ? "border-red-line" : "border-line"
      } ${done ? "opacity-60" : ""}`}
    >
      {task.parent && <span className="text-[13px] leading-tight text-ink3">{t("task.subtaskOf", { title: task.parent.title })}</span>}
      {/* Same order as every row: title, where it belongs, status, dates, people. The column is the task's status;
          a video also shows its phase, which is what it is everywhere else. */}
      <div className="flex flex-col gap-1.5">
        <span className={`font-medium leading-[1.35] ${mobile ? "text-[18px]" : "text-[15px]"} ${done ? "line-through" : ""}`}>{task.title}</span>
        <ItemWhere task={task} />
      </div>
      {task.kind === "video" && <StatusLabel task={task} />}
      <div className="flex items-end justify-between gap-3">
        <ItemDates task={task} today={today} slots={false} />
        <AvatarStack people={task.assignees} size={26} />
      </div>
    </TaskLink>
  );
}

/** 4a / 4e: four status columns; drag a card to change its status (desktop), tabs on mobile. */
export function KanbanBoard({ tasks, today }: { tasks: Task[]; today: IsoDate }) {
  const t = useTranslations();
  const [, startTransition] = useTransition();
  const [optimistic, move] = useOptimistic(tasks, (cur, { id, status }: { id: string; status: TaskStatus }) =>
    cur.map((x) => (x.id === id ? { ...x, status } : x)),
  );
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [tab, setTab] = useState<TaskStatus>("todo");
  // Feedback: a card that just landed in a column (or appeared while you're here, e.g. one you just made)
  // slides in, and the counts that changed give a short flash.
  const [seen] = useState(() => new Set(tasks.map((x) => x.id)));
  const [landed, setLanded] = useState<string | null>(null);
  const isNew = (id: string) => id === landed || !seen.has(id);

  const columns = STATUSES.map((status) => ({
    status,
    cards: optimistic.filter((x) => x.status === status).sort(byDue),
  }));

  const drop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/task-id");
    const task = optimistic.find((x) => x.id === id);
    if (!task || task.status === status) return;
    setLanded(id);
    startTransition(async () => {
      move({ id, status });
      await updateTask(id, { status });
    });
  };

  const active = columns.find((c) => c.status === tab)!;

  return (
    <>
      {/* Mobile: status tabs */}
      <div className="flex flex-col lg:hidden">
        <div className="px-5 py-3">
          <Segmented
            scroll
            items={columns.map((c) => ({
              key: c.status,
              label: t(`status.${c.status === "waiting_client" ? "waiting_clientShort" : c.status}`),
              active: tab === c.status,
              onClick: () => setTab(c.status),
              dot: STATUS_COLOR[c.status],
              count: c.cards.length,
            }))}
          />
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-[calc(120px+env(safe-area-inset-bottom))]">
          {active.cards.length ? (
            active.cards.map((x) => (
              <div key={x.id} className={isNew(x.id) ? "snf-in" : undefined}>
                <KanbanCard task={x} today={today} mobile />
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-line2 px-4 py-8 text-center text-[14px] text-ink3">{t("kanban.empty")}</p>
          )}
        </div>
      </div>

      {/* Desktop: columns */}
      <div className="hidden min-h-0 flex-1 grid-cols-4 gap-4 px-10 pt-6 lg:grid">
        {columns.map((c) => (
          <div
            key={c.status}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(c.status);
            }}
            onDragLeave={() => setOver((o) => (o === c.status ? null : o))}
            onDrop={drop(c.status)}
            className={`flex min-h-[calc(100dvh-170px)] flex-col gap-3 rounded-t-lg px-3 pt-3.5 transition-colors ${over === c.status ? "bg-rust-bg" : "bg-chip"}`}
          >
            <div className="flex items-center gap-2.5 px-1 pb-1">
              <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[c.status] }} />
              <span className="whitespace-nowrap text-[14px] font-semibold">{t(`status.${c.status === "waiting_client" ? "waiting_clientShort" : c.status}`)}</span>
              <span key={c.cards.length} className={`text-[13px] font-medium text-ink3 ${landed ? "snf-flash" : ""}`}>
                {c.cards.length}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 pb-5">
              {c.cards.map((x) => (
                <div key={x.id} className={isNew(x.id) ? "snf-in" : undefined}>
                  <KanbanCard task={x} today={today} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

