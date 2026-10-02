"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { updateTask } from "@/app/(app)/task-actions";
import { AvatarStack } from "@/components/ui/Avatar";
import type { IsoDate } from "@/lib/dates";
import { STATUSES, STATUS_COLOR, byDue, type Task, type TaskStatus } from "@/lib/tasks";
import { DueChip, dueTone } from "./bits";
import { TaskLink } from "./links";
import { PhaseBar, VideoTag } from "./video-bits";

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
      className={`flex flex-col border bg-surf ${mobile ? "gap-[11px] rounded-[10px] p-4" : "cursor-grab gap-[11px] rounded-lg p-3.5 active:cursor-grabbing"} ${
        late ? "border-red-line" : "border-line"
      } ${done ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate font-semibold uppercase leading-tight tracking-[0.12em] text-ink3 ${mobile ? "text-[12px]" : "text-[11px]"}`}>
          {task.client?.name ?? t("task.noClient")}
        </span>
        {task.kind === "video" ? (
          <VideoTag contentType={mobile ? task.content_type : null} />
        ) : (
          task.type && <span className={`flex-none font-medium text-ink3 ${mobile ? "text-[13px]" : "text-[12px]"}`}>{t(`taskType.${task.type}`)}</span>
        )}
      </div>
      {task.parent && <span className="text-[12.5px] leading-tight text-ink3">{t("task.subtaskOf", { title: task.parent.title })}</span>}
      <span className={`font-medium leading-[1.35] ${mobile ? "text-[17px]" : "text-[15px]"} ${done ? "line-through" : ""}`}>{task.title}</span>
      {task.kind === "video" && <PhaseBar task={task} />}
      <div className="flex items-center justify-between">
        <DueChip task={task} today={today} />
        <AvatarStack people={task.assignees} size={26} />
      </div>
    </TaskLink>
  );
}

/** 4a / 4e: four status columns; drag a card to change its status (desktop), tabs on mobile. */
export function KanbanBoard({ tasks, today }: { tasks: Task[]; today: IsoDate }) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, move] = useOptimistic(tasks, (cur, { id, status }: { id: string; status: TaskStatus }) =>
    cur.map((x) => (x.id === id ? { ...x, status } : x)),
  );
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [tab, setTab] = useState<TaskStatus>("todo");

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
    startTransition(async () => {
      move({ id, status });
      await updateTask(id, { status });
      router.refresh();
    });
  };

  const active = columns.find((c) => c.status === tab)!;

  return (
    <>
      {/* Mobile: status tabs */}
      <div className="flex flex-col lg:hidden">
        <div className="no-scrollbar flex flex-none gap-2 overflow-x-auto px-5 py-3.5">
          {columns.map((c) => (
            <button
              key={c.status}
              type="button"
              onClick={() => setTab(c.status)}
              className={`flex h-11 flex-none cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[15px] font-medium ${
                tab === c.status ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"
              }`}
            >
              <span className="size-[9px] rounded-full" style={{ background: STATUS_COLOR[c.status] }} />
              {t(`status.${c.status}`)}
              <span className="opacity-60">{c.cards.length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-[120px]">
          {active.cards.length ? (
            active.cards.map((x) => <KanbanCard key={x.id} task={x} today={today} mobile />)
          ) : (
            <p className="rounded-[10px] border border-dashed border-line2 px-4 py-8 text-center text-[14px] text-ink3">{t("kanban.empty")}</p>
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
            className={`flex min-h-[calc(100dvh-170px)] flex-col gap-3 rounded-t-[10px] px-3 pt-3.5 transition-colors ${over === c.status ? "bg-rust-bg" : "bg-chip"}`}
          >
            <div className="flex items-center gap-2.5 px-1 pb-1">
              <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[c.status] }} />
              <span className="whitespace-nowrap text-[14px] font-semibold">{t(`status.${c.status}`)}</span>
              <span className="text-[13px] font-medium text-ink3">{c.cards.length}</span>
            </div>
            <div className="flex flex-col gap-2.5 pb-5">
              {c.cards.map((x) => (
                <KanbanCard key={x.id} task={x} today={today} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

