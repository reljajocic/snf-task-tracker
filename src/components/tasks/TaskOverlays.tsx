"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Lookups } from "@/lib/data";
import type { IsoDate } from "@/lib/dates";
import { STATUSES, type TaskStatus } from "@/lib/tasks";
import { NewTaskModal } from "./NewTaskModal";
import { TaskPanel } from "./TaskPanel";

/**
 * Mounted once in the app layout. Shows the task panel for ?task=<id> and the new-task
 * form for ?new=1 (optionally prefilled with &client=, &project=, &due=, &status=).
 */
export function TaskOverlays({ lookups, today }: { lookups: Lookups; today: IsoDate }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const taskId = params.get("task");
  const isNew = params.get("new") === "1";

  const close = useCallback(() => {
    const next = new URLSearchParams(params);
    for (const k of ["task", "new", "client", "project", "due", "status", "kind", "publish", "shoot"]) next.delete(k);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  const status = params.get("status");

  return (
    <>
      {taskId && <TaskPanel key={taskId} id={taskId} lookups={lookups} today={today} onClose={close} />}
      {isNew && (
        <NewTaskModal
          lookups={lookups}
          today={today}
          onClose={close}
          defaults={{
            client_id: params.get("client"),
            project_id: params.get("project"),
            due_date: params.get("due"),
            status: STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : undefined,
            kind: params.get("kind") === "video" ? "video" : undefined,
            publish_date: params.get("publish"),
            shoot_id: params.get("shoot"),
          }}
        />
      )}
    </>
  );
}
