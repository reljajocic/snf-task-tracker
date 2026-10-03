"use client";

import { ScriptDecisionBadge } from "@/components/tasks/ScriptDecisionBadge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useState, useTransition } from "react";
import { createTask, setShotStatus, updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { sectionsToText, textToSections } from "@/lib/script-text";
import type { ScriptSection, ShotStatus, Task } from "@/lib/tasks";
import { removeFromShoot } from "../actions";

const STATUS_STYLE: Record<ShotStatus, string> = {
  to_shoot: "text-ink2",
  shot: "text-[var(--status-in-progress)]",
  not_shot: "text-[var(--prio-urgent)]",
};

const cell = "w-full min-w-0 rounded border-0 bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none focus:bg-chip focus-visible:shadow-none";

/**
 * The shoot day as the team's Google Sheet: #, status, time, person, type, title, text, reference, note.
 * Rows are sorted by time. Text and notes show formatted until clicked; clicking a row's # or title
 * opens the full script underneath.
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
  const [open, setOpen] = useState<string | null>(null);

  const save = (id: string, patch: TaskPatch) =>
    startTransition(async () => {
      await updateTask(id, patch);
      router.refresh();
    });

  const addRow = () => {
    setAdding(true);
    startTransition(async () => {
      const last = videos.at(-1);
      await createTask({
        title: t("untitled"),
        kind: "video",
        client_id: clientId,
        project_id: null,
        assignee_ids: [],
        shoot_id: shootId,
        shoot_time: last?.shoot_time ?? null,
        on_camera: last?.on_camera ?? null,
      });
      setAdding(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 px-10 pb-12 pt-5">
      <div className="overflow-x-auto rounded-lg border border-line bg-surf">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.12em] text-ink3">
              <th className="w-10 px-3 py-2.5">#</th>
              <th className="w-[124px] px-2 py-2.5">{t("status")}</th>
              <th className="w-[78px] px-2 py-2.5">{t("time")}</th>
              <th className="w-[150px] px-2 py-2.5">{t("person")}</th>
              <th className="w-[90px] px-2 py-2.5">{t("type")}</th>
              <th className="w-[200px] px-2 py-2.5">{t("title")}</th>
              <th className="px-2 py-2.5">{t("text")}</th>
              <th className="w-[130px] px-2 py-2.5">{t("reference")}</th>
              <th className="w-[170px] px-2 py-2.5">{t("note")}</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {videos.map((v, i) => {
              const status = (v.shot_status ?? "to_shoot") as ShotStatus;
              const isOpen = open === v.id;
              const toggle = () => setOpen(isOpen ? null : v.id);
              return (
                <Fragment key={v.id}>
                  <tr className={`border-b border-line align-top ${isOpen ? "bg-chip" : ""}`}>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={toggle} title={isOpen ? t("collapse") : t("expand")} className="cursor-pointer text-[13px] text-ink3 hover:text-ink">
                        {i + 1}
                        <span className="ml-1 text-[10px]">{isOpen ? "▲" : "▼"}</span>
                      </button>
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
                        className={`${cell} cursor-pointer text-[12px] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLE[status]}`}
                      >
                        <option value="to_shoot">{t("toShoot")}</option>
                        <option value="shot">{t("filmed")}</option>
                        <option value="not_shot">{t("notFilmed")}</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <InputCell value={v.shoot_time ?? ""} disabled={!editable} placeholder="—" onSave={(x) => save(v.id, { shoot_time: x.trim() || null })} className="font-semibold" />
                    </td>
                    <td className="px-1 py-1">
                      <InputCell value={v.on_camera ?? ""} disabled={!editable} onSave={(x) => save(v.id, { on_camera: x })} />
                    </td>
                    <td className="px-1 py-1">
                      <InputCell value={v.content_type ?? ""} disabled={!editable} list={`tags-${shootId}`} upper onSave={(x) => save(v.id, { content_type: x.toUpperCase() })} />
                    </td>
                    <td className="px-1 py-1">
                      <InputCell value={v.title} disabled={!editable} onSave={(x) => x.trim() && save(v.id, { title: x })} className="font-medium" />
                      {v.script_decision && (
                        <span className="block px-2 pb-1">
                          <ScriptDecisionBadge decision={v.script_decision} />
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <TextCell
                        value={sectionsToText(v.script)}
                        disabled={!editable}
                        placeholder="HOOK: …"
                        onSave={(x) => save(v.id, { script: textToSections(x) })}
                        render={() => <ScriptPreview sections={v.script} clamp />}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <TextCell
                        value={v.reference_url ?? ""}
                        disabled={!editable}
                        singleLine
                        placeholder="https://…"
                        onSave={(x) => save(v.id, { reference_url: x })}
                        render={(val) => <LinkPreview url={val} />}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <TextCell value={v.note ?? ""} disabled={!editable} onSave={(x) => save(v.id, { note: x })} render={(val) => <Linkified text={val} />} />
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
                  {isOpen && (
                    <tr className="border-b border-line bg-chip">
                      <td />
                      <td colSpan={9} className="px-2 pb-5 pt-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-8">
                          <ScriptPreview sections={v.script} />
                          <div className="flex flex-col gap-3 text-[14px]">
                            {v.reference_url && <LinkPreview url={v.reference_url} full />}
                            {v.note && <Linkified text={v.note} />}
                            <TaskLink id={v.id} className="text-[13px] font-medium text-rust-ink">
                              {t("openPanel")}
                            </TaskLink>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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

/** HOOK / CTA / BODY with the label set off in the accent color. */
export function ScriptPreview({ sections, clamp = false }: { sections: ScriptSection[]; clamp?: boolean }) {
  const t = useTranslations("shootSheet");
  const filled = sections.filter((s) => s.text.trim() || s.label.trim());
  if (!filled.length) return <span className="text-[14px] text-ink3">{t("empty")}</span>;
  return (
    <div className={`flex flex-col gap-2 ${clamp ? "max-h-[96px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" : ""}`}>
      {filled.map((s, i) => (
        <div key={i} className={clamp ? "text-[13.5px] leading-snug" : "grid grid-cols-[84px_minmax(0,1fr)] gap-3"}>
          {s.label && (
            <span className={`font-semibold uppercase tracking-[0.12em] text-accent ${clamp ? "mr-1.5 text-[10.5px]" : "pt-[3px] text-[11px]"}`}>{s.label}</span>
          )}
          <span className={`whitespace-pre-wrap text-ink2 ${clamp ? "" : `text-[15px] leading-relaxed ${s.label ? "" : "col-span-2"}`}`}>{s.text}</span>
        </div>
      ))}
    </div>
  );
}

function shortUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

function LinkPreview({ url, full = false }: { url: string; full?: boolean }) {
  if (!url.trim()) return <span className="text-[14px] text-ink3">—</span>;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={url}
      className={`block font-medium text-rust-ink hover:underline ${full ? "break-all text-[14px]" : "truncate text-[13px]"}`}
    >
      {full ? shortUrl(url) : `↗ ${new URL(href).hostname.replace(/^www\./, "")}`}
    </a>
  );
}

/** Plain text with any URLs turned into short clickable links. */
function Linkified({ text }: { text: string }) {
  if (!text.trim()) return <span className="text-[13px] text-ink3">—</span>;
  const parts = text.split(/(https?:\/\/[^\s]+)/gi);
  return (
    <span className="whitespace-pre-wrap break-words text-[13px] leading-snug text-ink2">
      {parts.map((p, i) =>
        /^https?:\/\//i.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={p} className="text-rust-ink hover:underline">
            ↗ {new URL(p).hostname.replace(/^www\./, "")}
          </a>
        ) : (
          p
        ),
      )}
    </span>
  );
}

/** Short single-line cell: always an input, saves on blur / Enter. */
function InputCell({
  value,
  onSave,
  disabled,
  placeholder,
  list,
  upper,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  list?: string;
  upper?: boolean;
  className?: string;
}) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setV(value);
  }
  return (
    <input
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      list={list}
      onChange={(e) => setV(upper ? e.target.value.toUpperCase() : e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`${cell} ${className}`}
    />
  );
}

/** Long cell: formatted preview until clicked, then a textarea; saves on blur. */
function TextCell({
  value,
  onSave,
  render,
  disabled,
  placeholder,
  singleLine,
}: {
  value: string;
  onSave: (v: string) => void;
  render: (value: string) => React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  singleLine?: boolean;
}) {
  const t = useTranslations("shootSheet");
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  if (!editing) {
    return (
      <div
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        title={disabled ? undefined : t("clickToEdit")}
        onClick={() => {
          if (disabled) return;
          setV(value);
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (!disabled && e.key === "Enter") {
            setV(value);
            setEditing(true);
          }
        }}
        className={`min-h-[34px] rounded px-2 py-1.5 ${disabled ? "" : "cursor-text hover:bg-chip"}`}
      >
        {render(value)}
      </div>
    );
  }
  const finish = () => {
    setEditing(false);
    if (v !== value) onSave(v);
  };
  return singleLine ? (
    <input autoFocus value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={finish} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className={`${cell} bg-chip`} />
  ) : (
    <textarea
      autoFocus
      value={v}
      placeholder={placeholder}
      rows={Math.min(16, Math.max(3, v.split("\n").length + 1, Math.ceil(v.length / 46)))}
      onChange={(e) => setV(e.target.value)}
      onBlur={finish}
      className={`${cell} resize-y bg-chip leading-relaxed`}
    />
  );
}
