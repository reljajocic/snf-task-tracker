"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { createTask } from "@/app/(app)/task-actions";
import { Button } from "@/components/ui/Button";
import type { Lookups } from "@/lib/data";
import { formatDate, type IsoDate } from "@/lib/dates";
import { parseEstimate, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/tasks";
import { Pill } from "./bits";
import { MonthGrid, quickDates } from "./DatePicker";
import { ClientProjectSelects, PeoplePicker, PriorityPicker, StatusPicker, TypePicker, inputClass } from "./fields";

/** New task: centered 760px modal on desktop (3b), full screen sheet on mobile (3d). */
export function NewTaskModal({
  lookups,
  today,
  defaults,
  onClose,
}: {
  lookups: Lookups;
  today: IsoDate;
  defaults: { client_id?: string | null; project_id?: string | null; due_date?: string | null; status?: TaskStatus };
  onClose: () => void;
}) {
  const t = useTranslations("task");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [where, setWhere] = useState({ client_id: defaults.client_id ?? null, project_id: defaults.project_id ?? null });
  const [assignees, setAssignees] = useState<string[]>([lookups.me.id]);
  const [due, setDue] = useState<IsoDate | null>(defaults.due_date ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(defaults.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [type, setType] = useState<TaskType | null>(null);
  const [estimate, setEstimate] = useState("");
  const [drive, setDrive] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const client = lookups.clients.find((c) => c.id === where.client_id);
  const needsProject = Boolean(client && !client.canManage && !where.project_id);
  const canSave = title.trim().length > 0 && !needsProject && !pending;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = () =>
    startTransition(async () => {
      const res = await createTask({
        title,
        ...where,
        assignee_ids: assignees,
        due_date: due,
        status,
        priority,
        type,
        estimate_minutes: parseEstimate(estimate),
        drive_url: drive,
        description,
      });
      if (!res.ok) return setError(t("saveFailed", { message: res.error }));
      onClose();
      router.refresh();
    });

  const label = (text: string) => <span className="text-[13px] font-medium text-ink3">{text}</span>;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[var(--overlay)] lg:p-6">
      <button type="button" aria-label={t("cancel")} onClick={onClose} className="absolute inset-0 cursor-default" />
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) submit();
        }}
        className="relative flex h-full w-full flex-col overflow-hidden bg-bg lg:h-auto lg:max-h-[calc(100dvh-48px)] lg:w-[760px] lg:rounded-[10px] lg:border lg:border-line2 lg:shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between px-5 pt-6 lg:px-7 lg:pt-[22px]">
          <h2 className="display whitespace-nowrap text-[22px] leading-tight">{t("new")}</h2>
          <button type="button" aria-label={t("cancel")} onClick={onClose} className="size-[34px] cursor-pointer rounded-md text-[22px] text-ink2 hover:text-ink">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-auto px-5 pb-6 pt-[18px] lg:px-7">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            className="focus-visible:shadow-none w-full border-0 border-b border-accent bg-transparent py-2 text-[20px] font-medium leading-tight text-ink outline-none placeholder:text-ink3 lg:text-[24px]"
          />

          <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
            <ClientProjectSelects layout="grid" clients={lookups.clients} clientId={where.client_id} projectId={where.project_id} onChange={setWhere} />
            {needsProject && <p className="text-[13px] text-rust-ink sm:col-span-2">{t("pickProject")}</p>}

            <div className="flex flex-col gap-2 sm:col-span-2">
              {label(t("fields.assignees"))}
              <PeoplePicker size="lg" people={lookups.people} value={assignees} onChange={setAssignees} />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              {label(t("fields.due"))}
              <div className="flex flex-wrap items-center gap-1.5">
                {quickDates(today).map((q) => (
                  <Pill key={q.key} size="lg" selected={due === q.date} onClick={() => setDue(due === q.date ? null : q.date)}>
                    {t(`quick.${q.key}`)}
                  </Pill>
                ))}
                <button type="button" onClick={() => setPickerOpen((o) => !o)} className="ml-2 cursor-pointer whitespace-nowrap text-[14px] font-semibold text-ink">
                  {due ? formatDate(due) : t("noDue")} ▾
                </button>
              </div>
              {pickerOpen && (
                <div className="w-[300px] rounded-lg border border-line2 bg-surf p-3.5">
                  <MonthGrid value={due} today={today} onPick={(d) => { setDue(d); setPickerOpen(false); }} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {label(t("fields.status"))}
              <StatusPicker value={status} onChange={setStatus} />
            </div>
            <div className="flex flex-col gap-2">
              {label(t("fields.priority"))}
              <PriorityPicker value={priority} onChange={setPriority} />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              {label(t("fields.type"))}
              <TypePicker value={type} onChange={setType} />
            </div>

            <label className="flex flex-col gap-2">
              {label(t("fields.estimate"))}
              <input value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder={t("estimatePlaceholder")} className={inputClass} />
            </label>
            <label className="flex flex-col gap-2">
              {label(t("fields.driveLink"))}
              <input value={drive} onChange={(e) => setDrive(e.target.value)} placeholder="drive.google.com/…" className={inputClass} />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              {label(t("fields.description"))}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t("descriptionPlaceholder")}
                className="resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] leading-normal text-ink outline-none placeholder:text-ink3 focus:border-accent"
              />
            </label>
          </div>
          {error && <p role="alert" className="rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-ink">{error}</p>}
        </div>

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-line px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:px-7 lg:pb-4">
          <button type="button" onClick={onClose} className="hidden h-10 cursor-pointer px-4 text-[14px] font-medium text-ink2 lg:block">
            {t("cancel")}
          </button>
          <Button type="submit" size="sm" disabled={!canSave} className="h-14 w-full lg:h-10 lg:w-auto">
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
