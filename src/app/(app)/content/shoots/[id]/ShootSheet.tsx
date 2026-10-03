"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createTask, setShotStatus, updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { sectionsToText, textToSections } from "@/lib/script-text";
import type { ShotStatus, Task } from "@/lib/tasks";
import { removeFromShoot } from "../actions";

const STATUS_STYLE: Record<ShotStatus, string> = {
  to_shoot: "text-ink2",
  shot: "text-[var(--status-in-progress)]",
  not_shot: "text-[var(--prio-urgent)]",
};

const cell = "w-full min-w-0 border-0 bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none focus-visible:shadow-none focus:bg-chip rounded";

/**
 * The shoot day as the team's Google Sheet: #, status, time, person, type, title, text, note.
 * Every cell saves on blur; "+ Row" adds a video to this shoot.
 */
export function ShootSheet({
  shootId,
  clientId,
  videos,
  tags,
  editable,
}: {
  shootId: string;
  clientId: string;
  videos: Task[];
  tags: string[];
  editable: boolean;
}) {
  const t = useTranslations("shootSheet");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const save = (id: string, patch: TaskPatch) =>
    startTransition(async () => {
      await updateTask(id, patch);
      router.refresh();
    });

  const addRow = () => {
    setAdding(true);
    startTransition(async () => {
      await createTask({
        title: t("untitled"),
        kind: "video",
        client_id: clientId,
        project_id: null,
        assignee_ids: [],
        shoot_id: shootId,
        shoot_time: null,
      });
      setAdding(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 px-10 pb-12 pt-5">
      <div className="overflow-x-auto rounded-lg border border-line bg-surf">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.12em] text-ink3">
              <th className="w-10 px-3 py-2.5">#</th>
              <th className="w-[124px] px-2 py-2.5">{t("status")}</th>
              <th className="w-[78px] px-2 py-2.5">{t("time")}</th>
              <th className="w-[160px] px-2 py-2.5">{t("person")}</th>
              <th className="w-[96px] px-2 py-2.5">{t("type")}</th>
              <th className="w-[220px] px-2 py-2.5">{t("title")}</th>
              <th className="px-2 py-2.5">{t("text")}</th>
              <th className="w-[200px] px-2 py-2.5">{t("note")}</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {videos.map((v, i) => {
              const status = (v.shot_status ?? "to_shoot") as ShotStatus;
              return (
                <tr key={v.id} className="border-b border-line align-top last:border-b-0">
                  <td className="px-3 py-2.5 text-[13px] text-ink3">
                    <TaskLink id={v.id} className="hover:text-ink" title={t("open")}>
                      {i + 1}
                    </TaskLink>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={status}
                      disabled={!editable}
                      onChange={(e) =>
                        startTransition(async () => {
                          await setShotStatus(v.id, e.target.value as ShotStatus);
                          router.refresh();
                        })
                      }
                      className={`${cell} cursor-pointer font-semibold uppercase tracking-[0.06em] text-[12px] ${STATUS_STYLE[status]}`}
                    >
                      <option value="to_shoot">{t("toShoot")}</option>
                      <option value="shot">{t("filmed")}</option>
                      <option value="not_shot">{t("notFilmed")}</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Cell value={v.shoot_time ?? ""} disabled={!editable} placeholder="—" onSave={(x) => save(v.id, { shoot_time: x.trim() || null })} className="font-semibold" />
                  </td>
                  <td className="px-1 py-1">
                    <Cell value={v.on_camera ?? ""} disabled={!editable} onSave={(x) => save(v.id, { on_camera: x })} />
                  </td>
                  <td className="px-1 py-1">
                    <Cell value={v.content_type ?? ""} disabled={!editable} list={`tags-${shootId}`} upper onSave={(x) => save(v.id, { content_type: x.toUpperCase() })} />
                  </td>
                  <td className="px-1 py-1">
                    <Cell value={v.title} disabled={!editable} multiline onSave={(x) => x.trim() && save(v.id, { title: x })} className="font-medium" />
                  </td>
                  <td className="px-1 py-1">
                    <Cell
                      value={sectionsToText(v.script)}
                      disabled={!editable}
                      multiline
                      placeholder="HOOK: …"
                      onSave={(x) => save(v.id, { script: textToSections(x) })}
                      className="text-ink2"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Cell value={v.note ?? ""} disabled={!editable} multiline onSave={(x) => save(v.id, { note: x })} className="text-[13px] text-ink2" />
                  </td>
                  <td className="px-1 py-2">
                    {editable && (
                      <button
                        type="button"
                        aria-label={t("remove")}
                        title={t("remove")}
                        onClick={() => startTransition(async () => { await removeFromShoot(v.id); router.refresh(); })}
                        className="cursor-pointer text-[15px] text-ink3 hover:text-red-ink"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id={`tags-${shootId}`}>{tags.map((x) => <option key={x} value={x} />)}</datalist>
      </div>
      {editable && (
        <button type="button" disabled={adding} onClick={addRow} className="cursor-pointer self-start text-[14px] font-medium text-rust-ink disabled:opacity-50">
          {t("addRow")}
        </button>
      )}
    </div>
  );
}

/** Spreadsheet-style cell: plain until focused, saves on blur (Enter saves single-line cells). */
function Cell({
  value,
  onSave,
  disabled,
  multiline,
  placeholder,
  list,
  upper,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  list?: string;
  upper?: boolean;
  className?: string;
}) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  // Pick up server changes (after a refresh) when the cell isn't being edited.
  if (value !== prev) {
    setPrev(value);
    setV(value);
  }
  const commit = () => v !== value && onSave(v);

  if (multiline) {
    return (
      <textarea
        value={v}
        disabled={disabled}
        placeholder={placeholder}
        rows={Math.min(6, Math.max(1, v.split("\n").length, Math.ceil(v.length / 48)))}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        className={`${cell} resize-none leading-relaxed ${className}`}
      />
    );
  }
  return (
    <input
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      list={list}
      onChange={(e) => setV(upper ? e.target.value.toUpperCase() : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${cell} ${className}`}
    />
  );
}
