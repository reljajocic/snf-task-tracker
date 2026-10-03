"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import {
  addComment,
  deleteComment,
  deleteTask,
  loadTask,
  setAssignees,
  updateTask,
  type TaskDetail,
  type TaskPatch,
} from "@/app/(app)/task-actions";
import { Avatar } from "@/components/ui/Avatar";
import type { Lookups } from "@/lib/data";
import { formatDate, type IsoDate } from "@/lib/dates";
import { formatEstimate, parseEstimate, type Task } from "@/lib/tasks";
import { dueTone, useDueText } from "./bits";
import { DatePicker } from "./DatePicker";
import { ClientProjectSelects, FieldRow, PeoplePicker, assignablePeople, PriorityPicker, StatusPicker, TypePicker } from "./fields";
import { dueLabel } from "@/lib/dates";
import { VideoSection } from "./VideoSection";
import { VideoTag } from "./video-bits";

const TONE = { late: "bg-red-bg text-red-ink", today: "bg-rust-bg text-rust-ink", normal: "bg-chip text-ink2" };

/** Side panel over the current screen (3a), full screen on mobile (3c). Saves on every change. */
export function TaskPanel({ id, lookups, today, onClose }: { id: string; lookups: Lookups; today: IsoDate; onClose: () => void }) {
  const t = useTranslations("task");
  const router = useRouter();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const res = await loadTask(id);
    if (res.ok) setDetail(res.data);
    else if (res.error === "not_found") setMissing(true);
    else setError(res.error);
  };

  useEffect(() => {
    let live = true;
    loadTask(id).then((res) => {
      if (!live) return;
      if (res.ok) setDetail(res.data);
      else if (res.error === "not_found") setMissing(true);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 cursor-default bg-[var(--overlay)]" />
      <section
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line2 bg-bg shadow-[-20px_0_60px_rgba(0,0,0,0.35)] lg:w-[680px]"
      >
        {missing ? (
          <div className="flex flex-1 flex-col items-start gap-4 p-7">
            <p className="text-[15px] text-ink2">{t("notFound")}</p>
            <button type="button" onClick={onClose} className="cursor-pointer text-[14px] text-ink underline">
              {t("close")}
            </button>
          </div>
        ) : !detail ? (
          <div className="flex-1 p-7 text-[14px] text-ink3">…</div>
        ) : (
          <PanelBody
            key={detail.task.id}
            detail={detail}
            lookups={lookups}
            today={today}
            error={error}
            setError={setError}
            onClose={onClose}
            onChanged={() => {
              router.refresh();
              void reload();
            }}
          />
        )}
      </section>
    </div>
  );
}

function PanelBody({
  detail,
  lookups,
  today,
  error,
  setError,
  onClose,
  onChanged,
}: {
  detail: TaskDetail;
  lookups: Lookups;
  today: IsoDate;
  error: string | null;
  setError: (e: string | null) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations("task");
  const dueText = useDueText();
  const [task, setTask] = useState<Task>(detail.task);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [drive, setDrive] = useState(task.drive_url ?? "");
  const [estimate, setEstimate] = useState(formatEstimate(task.estimate_minutes) ?? "");
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const disabled = !detail.canEdit;

  const save = (patch: TaskPatch, optimistic: Partial<Task> = {}) => {
    setTask((cur) => ({ ...cur, ...optimistic }));
    startTransition(async () => {
      const res = await updateTask(task.id, patch);
      if (!res.ok) setError(t("saveFailed", { message: res.error }));
      else setError(null);
      onChanged();
    });
  };

  const saveAssignees = (ids: string[]) => {
    setTask((cur) => ({ ...cur, assignees: lookups.people.filter((p) => ids.includes(p.id)) }));
    startTransition(async () => {
      const res = await setAssignees(task.id, ids);
      if (!res.ok) setError(t("saveFailed", { message: res.error }));
      onChanged();
    });
  };

  const remove = () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (!res.ok) return setError(t("saveFailed", { message: res.error }));
      onClose();
      onChanged();
    });
  };

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("task", task.id);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const done = task.status === "done";
  // Videos only get a deadline/status/priority once they're in edit (phase 2+).
  const editStage = task.kind !== "video" || (task.phase ?? 0) >= 2;
  const label = task.due_date ? dueLabel(task.due_date, today, done) : null;
  const tone = dueTone(task, today);
  const header = [task.client?.name ?? t("noClient"), task.project?.name].filter(Boolean).join(" · ");

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 lg:px-7 lg:py-[18px]">
        <span className="flex min-w-0 items-center gap-2.5">
          {task.kind === "video" && <VideoTag contentType={task.content_type} size="md" />}
          <span className="truncate text-[13px] font-medium text-ink3">{header}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={copyLink} className="h-[34px] cursor-pointer whitespace-nowrap rounded-md border border-line2 px-3 text-[13px] font-medium text-ink2 hover:text-ink">
            {copied ? t("copied") : t("copyLink")}
          </button>
          <button type="button" aria-label={t("close")} onClick={onClose} className="size-[34px] cursor-pointer rounded-md text-[22px] text-ink2 hover:text-ink">
            ×
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-5 pb-28 pt-6 lg:px-7 lg:pb-8">
        {error && <p role="alert" className="rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-ink">{error}</p>}
        {task.parent && <span className="-mb-4 text-[13px] text-ink3">{t("subtaskOf", { title: task.parent.title })}</span>}

        <input
          value={title}
          disabled={disabled}
          aria-label={t("titlePlaceholder")}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title.trim() !== task.title && save({ title }, { title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="focus-visible:shadow-none w-full border-0 border-b border-transparent bg-transparent py-1 text-[22px] font-medium leading-tight text-ink outline-none focus:border-accent lg:text-[26px]"
        />

        {task.kind === "video" && (
          <VideoSection task={task} lookups={lookups} today={today} disabled={disabled} save={save} onChanged={onChanged} />
        )}

        <div className="flex flex-col">
          {editStage && (
            <>
              <FieldRow label={t("fields.status")}>
                <StatusPicker value={task.status} disabled={disabled} onChange={(status) => save({ status }, { status })} />
              </FieldRow>
              <FieldRow label={t("fields.priority")}>
                <PriorityPicker value={task.priority} disabled={disabled} onChange={(priority) => save({ priority }, { priority })} />
              </FieldRow>
            </>
          )}
          <FieldRow label={t("fields.assignees")}>
            <PeoplePicker
              people={assignablePeople(lookups, task.client?.id, task.assignees.map((a) => a.id))}
              value={task.assignees.map((a) => a.id)}
              disabled={disabled}
              onChange={saveAssignees}
            />
          </FieldRow>
          {editStage && (
            <>
          <FieldRow label={t("fields.due")}>
            <div className="flex flex-wrap items-center gap-2.5">
              <DatePicker value={task.due_date} today={today} disabled={disabled} onChange={(due_date) => save({ due_date }, { due_date })} />
              {label && <span className={`whitespace-nowrap rounded-[5px] px-2.5 py-2 text-[13px] font-semibold leading-none ${TONE[tone]}`}>{dueText(label)}</span>}
            </div>
          </FieldRow>
          <FieldRow label={t("fields.estimate")}>
            <input
              value={estimate}
              disabled={disabled}
              placeholder={t("estimatePlaceholder")}
              title={t("estimateHint")}
              onChange={(e) => setEstimate(e.target.value)}
              onBlur={() => {
                const minutes = parseEstimate(estimate);
                setEstimate(formatEstimate(minutes) ?? "");
                if (minutes !== task.estimate_minutes) save({ estimate_minutes: minutes }, { estimate_minutes: minutes });
              }}
              className="h-9 w-32 rounded-md border border-line2 bg-transparent px-3 text-[14px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink3 focus:border-accent"
            />
          </FieldRow>
            </>
          )}
          <ClientProjectSelects
            clients={lookups.clients}
            clientId={task.client?.id ?? null}
            projectId={task.project?.id ?? null}
            disabled={disabled}
            onChange={(next) => {
              const client = lookups.clients.find((c) => c.id === next.client_id);
              const project = client?.projects.find((p) => p.id === next.project_id);
              save(next, {
                client: client ? { id: client.id, name: client.name } : null,
                project: project ? { id: project.id, name: project.name } : null,
              });
            }}
          />
          {task.kind !== "video" && (
            <div className="border-b border-line">
              <FieldRow label={t("fields.type")} top>
                <TypePicker value={task.type} disabled={disabled} onChange={(type) => save({ type }, { type })} />
              </FieldRow>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="eyebrow">{t("fields.drive")}</span>
          <div className="flex h-[46px] items-center gap-2 rounded-md border border-line2 pl-3.5 pr-1.5 focus-within:border-accent">
            <input
              value={drive}
              disabled={disabled}
              placeholder={t("drivePlaceholder")}
              onChange={(e) => setDrive(e.target.value)}
              onBlur={() => drive.trim() !== (task.drive_url ?? "") && save({ drive_url: drive }, { drive_url: drive.trim() || null })}
              className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink3"
            />
            {task.drive_url && (
              <a href={task.drive_url} target="_blank" rel="noreferrer" className="flex h-[34px] items-center whitespace-nowrap rounded-[5px] bg-chip px-3 text-[13px] font-medium text-ink">
                {t("open")}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="eyebrow">{t("fields.description")}</span>
          <textarea
            value={description}
            disabled={disabled}
            rows={5}
            placeholder={t("descriptionPlaceholder")}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description.trim() !== (task.description ?? "") && save({ description }, { description: description.trim() || null })}
            className="w-full resize-y rounded-md border border-line2 bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-accent"
          />
        </div>

        <Comments detail={detail} meId={lookups.me.id} isAdmin={lookups.me.isAdmin} onChanged={onChanged} />
      </div>

      <div className="hidden items-center justify-between gap-3 border-t border-line px-7 py-4 lg:flex">
        <span className="text-[12.5px] leading-snug text-ink3">
          {t("createdBy", { name: detail.creatorName ?? "—", date: formatDate(task.created_at.slice(0, 10)) })}
        </span>
        {detail.canDelete && (
          <button type="button" onClick={remove} className="h-9 cursor-pointer whitespace-nowrap px-3 text-[13px] font-medium text-red-ink">
            {t("delete")}
          </button>
        )}
      </div>

      {/* Mobile: persistent primary action (3c) */}
      {!disabled && (
        <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-line bg-bg px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:hidden">
          <button
            type="button"
            onClick={() => save({ status: done ? "in_progress" : "done" }, { status: done ? "in_progress" : "done" })}
            className={`h-14 flex-1 cursor-pointer rounded-lg text-[15px] font-semibold uppercase tracking-[0.12em] ${done ? "border border-line2 text-ink" : "bg-accent text-charcoal"}`}
          >
            {done ? t("reopen") : t("markDone")}
          </button>
          {detail.canDelete && (
            <button type="button" onClick={remove} aria-label={t("delete")} className="h-14 cursor-pointer rounded-lg border border-line2 px-4 text-[13px] text-red-ink">
              {t("delete")}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Comments({ detail, meId, isAdmin, onChanged }: { detail: TaskDetail; meId: string; isAdmin: boolean; onChanged: () => void }) {
  const t = useTranslations("task");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      const res = await addComment(detail.task.id, body);
      if (res.ok) {
        setBody("");
        onChanged();
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">{t("comments")}</span>
      {detail.comments.length === 0 && <p className="text-[14px] text-ink3">{t("noComments")}</p>}
      <ul className="flex flex-col gap-4">
        {detail.comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.author && <Avatar person={c.author} size={28} />}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline gap-2 text-[13px]">
                <span className="font-semibold text-ink">{c.author?.full_name ?? "—"}</span>
                <span className="text-ink3">
                  {formatDate(c.created_at.slice(0, 10))} {c.created_at.slice(11, 16)}
                </span>
                {(c.author?.id === meId || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await deleteComment(c.id); onChanged(); })}
                    className="ml-auto cursor-pointer text-[12px] text-ink3 hover:text-red-ink"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink2">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          rows={2}
          placeholder={t("commentPlaceholder")}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) send();
          }}
          className="w-full resize-y rounded-md border border-line2 bg-transparent px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-accent"
        />
        <button
          type="button"
          disabled={pending || !body.trim()}
          onClick={send}
          className="h-9 cursor-pointer self-end rounded-md border border-line2 px-3.5 text-[13px] font-medium text-ink disabled:cursor-default disabled:opacity-45"
        >
          {t("commentSend")}
        </button>
      </div>
    </div>
  );
}
