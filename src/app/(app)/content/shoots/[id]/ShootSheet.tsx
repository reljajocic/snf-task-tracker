"use client";

import { ScriptDecisionBadge } from "@/components/tasks/ScriptDecisionBadge";
import { useTranslations } from "next-intl";
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { createTask, setShotStatus, updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { idsByTime } from "@/lib/script-text";
import type { ScriptSection, ShotStatus, Task } from "@/lib/tasks";
import { removeFromShoot, reorderShoot } from "../actions";
import { FORMATS, FORMAT_COLOR } from "@/lib/formats";
import { Segmented } from "@/components/ui/Segmented";
import { ScriptLabel } from "@/components/tasks/ScriptLabel";

const STATUS_STYLE: Record<ShotStatus, string> = {
  to_shoot: "text-ink2",
  shot: "text-[var(--status-in-progress)]",
  not_shot: "text-[var(--prio-urgent)]",
};

// Cells read as text until touched: a hint on hover, a rust edge while editing (a 7% tint alone was too faint).
const cellBase =
  "min-w-0 rounded-sm border-0 bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none enabled:hover:bg-hover focus:bg-chip focus-visible:shadow-[inset_0_0_0_1px_var(--accent)] focus:shadow-[inset_0_0_0_1px_var(--accent)]";
const cell = `w-full ${cellBase}`;
// The short fields in the line under a title: as wide as what's in them.
const inlineCell = `${cellBase} [field-sizing:content] min-w-[5ch] max-w-[280px] placeholder:text-transparent group-hover/row:placeholder:text-ink3 focus:placeholder:text-ink3`;

/**
 * The shoot day as the team's Google Sheet: #, status, time, person, type, title, text, reference, note.
 * Rows are sorted by time. Text and notes show formatted until clicked; clicking a row's # or title
 * opens the full script underneath.
 */
export function ShootSheet({
  shootId,
  clientId,
  videos,
  allIds,
  filters,
  tags,
  editable,
}: {
  shootId: string;
  clientId: string;
  videos: Task[];
  /** The whole day's running order, when some formats are hidden: moves keep the hidden ones in place. */
  allIds?: string[];
  /** More filters for the same row (the post type picker). */
  filters?: React.ReactNode;
  tags: string[];
  editable: boolean;
}) {
  const t = useTranslations("shootSheet");
  const tf = useTranslations("format");
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  // Scripts: whole (default) or just the start, for the whole sheet; each row can flip it.
  const [fullScripts, setFullScripts] = useState(true);
  const [scriptFlip, setScriptFlip] = useState<Record<string, boolean>>({});
  const scriptFull = (id: string) => (scriptFlip[id] ? !fullScripts : fullScripts);
  const setAllScripts = (full: boolean) => {
    setFullScripts(full);
    setScriptFlip({});
  };
  // "manual" is the saved running order (arrows move videos); the others only change the view.
  const [sort, setSort] = useState<"manual" | "time" | "status" | "person" | "type">("manual");
  const [ordered, reorder] = useOptimistic(videos, (cur, ids: string[]) => ids.map((id) => cur.find((v) => v.id === id)!).filter(Boolean));
  const STATUS_RANK: Record<string, number> = { to_shoot: 0, shot: 1, not_shot: 2 };
  const shown =
    sort === "manual"
      ? ordered
      : [...ordered].sort((a, b) => {
          const key = (v: Task) =>
            sort === "time"
              ? v.shoot_time ?? "99:99"
              : sort === "status"
                ? String(STATUS_RANK[v.shot_status ?? "to_shoot"] ?? 9)
                : sort === "person"
                  ? (v.on_camera ?? "\uffff").toLowerCase()
                  : // Type: videos, then photos, then carousels; within each, by content type.
                    `${FORMATS.indexOf(v.format)}${(v.content_type ?? "\uffff").toLowerCase()}`;
          // Ties keep the running order.
          return key(a).localeCompare(key(b)) || ordered.indexOf(a) - ordered.indexOf(b);
        });

  // The shown videos in their new order, put back into the slots they held in the whole day's order.
  const withHidden = (shownIds: string[]) => {
    if (!allIds) return shownIds;
    const shown = new Set(shownIds);
    let k = 0;
    return allIds.map((id) => (shown.has(id) ? shownIds[k++] : id));
  };

  const move = (id: string, dir: -1 | 1) => {
    const ids = ordered.map((v) => v.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    startTransition(async () => {
      reorder(ids);
      await reorderShoot(shootId, withHidden(ids));
    });
  };

  const saveTime = (v: Task, raw: string) => {
    const time = raw.trim() || null;
    startTransition(async () => {
      await updateTask(v.id, { shoot_time: time });
      // Entering a time slots the video into time order; arrows can still move it afterwards.
      const ids = idsByTime(ordered.map((x) => (x.id === v.id ? { ...x, shoot_time: time } : x)));
      reorder(ids);
      await reorderShoot(shootId, withHidden(ids));
    });
  };

  // Saves the running order as the times written in the sheet (untimed videos go last).
  const orderByTime = () => {
    const ids = idsByTime(ordered);
    setSort("manual");
    startTransition(async () => {
      reorder(ids);
      await reorderShoot(shootId, withHidden(ids));
    });
  };

  const save = (id: string, patch: TaskPatch) =>
    startTransition(async () => {
      await updateTask(id, patch);
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
    });
  };

  return (
    <div className="flex flex-col gap-3 px-10 pb-12 pt-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {filters}
        {/* Order is changed now and then: a quiet select, not a row of five buttons. */}
        <label className="flex h-8 items-center gap-1.5 rounded-md border border-line2 pl-3 text-[13px] font-medium text-ink3">
          {t("sortBy")}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-full cursor-pointer rounded-md bg-transparent pr-2 font-semibold text-ink outline-none">
            {(["manual", "time", "status", "person", "type"] as const).map((k) => (
              <option key={k} value={k}>{t(`sort.${k}`)}</option>
            ))}
          </select>
        </label>
        {sort !== "manual" && <span className="text-[13px] text-ink3">{t("sortViewOnly")}</span>}
        <Segmented
          size="sm"
          items={([true, false] as const).map((full) => ({
            key: String(full),
            label: t(full ? "scriptsFull" : "scriptsShort"),
            active: fullScripts === full && !Object.keys(scriptFlip).length,
            onClick: () => setAllScripts(full),
          }))}
        />
        {editable && ordered.some((v) => v.shoot_time) && (
          <button
            type="button"
            onClick={orderByTime}
            className="ml-auto h-8 cursor-pointer rounded-md border border-line2 px-3 text-[13px] font-medium text-ink2 hover:border-ink3 hover:text-ink"
          >
            {t("orderByTime")}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="snf-rows w-full min-w-[860px] table-fixed text-left">
          {/* No header row: number, video and note explain themselves. The video column stops at a reading width;
              any extra width goes to the note, not to a gap. */}
          <colgroup>
            <col className="w-[64px]" />
            <col className="w-[min(58%,820px)]" />
            <col />
            <col className="w-10" />
          </colgroup>
          <tbody>
            {shown.map((v, i) => {
              const status = (v.shot_status ?? "to_shoot") as ShotStatus;
              const isOpen = open === v.id;
              const toggle = () => setOpen(isOpen ? null : v.id);
              return (
                <Fragment key={v.id}>
                  <tr className={`group/row align-top ${isOpen ? "[&>td]:bg-chip" : ""}`}>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        {editable && sort === "manual" && (
                          <span className="flex flex-col">
                            <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(v.id, -1)} className="h-5 cursor-pointer px-0.5 text-[12px] leading-none text-ink3 hover:text-ink disabled:opacity-25">▲</button>
                            <button type="button" aria-label={t("moveDown")} disabled={i === shown.length - 1} onClick={() => move(v.id, 1)} className="h-5 cursor-pointer px-0.5 text-[12px] leading-none text-ink3 hover:text-ink disabled:opacity-25">▼</button>
                          </span>
                        )}
                        <button type="button" onClick={toggle} title={isOpen ? t("collapse") : t("expand")} aria-expanded={isOpen} className="cursor-pointer text-[14px] font-semibold text-ink2 hover:text-ink">
                          {i + 1}
                          <span className="ml-1 text-[12px] font-normal text-ink3">{isOpen ? "−" : "+"}</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1.5">
                        {/* Title and script open the video's own editor (the same panel as everywhere), so the
                            script's parts are edited one by one and never get mixed up in a single text box. */}
                        <TaskLink id={v.id} className="self-start rounded-sm px-2 text-[16px] font-semibold leading-snug hover:underline">
                          {v.title}
                        </TaskLink>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <select
                            value={status}
                            disabled={!editable}
                            aria-label={t("status")}
                            onChange={(e) =>
                              startTransition(async () => {
                                await setShotStatus(v.id, e.target.value as ShotStatus);
                              })
                            }
                            className={`${inlineCell} cursor-pointer text-[13px] font-semibold disabled:cursor-default ${STATUS_STYLE[status]}`}
                          >
                            <option value="to_shoot">{t("toShoot")}</option>
                            <option value="shot">{t("filmed")}</option>
                            <option value="not_shot">{t("notFilmed")}</option>
                          </select>
                          <InputCell value={v.shoot_time ?? ""} disabled={!editable} placeholder={t("time")} label={t("time")} onSave={(x) => saveTime(v, x)} className={`${inlineCell} font-semibold`} />
                          <InputCell value={v.on_camera ?? ""} disabled={!editable} placeholder={t("person")} label={t("person")} onSave={(x) => save(v.id, { on_camera: x })} className={inlineCell} />
                          <InputCell
                            value={v.content_type ?? ""}
                            disabled={!editable}
                            list={`tags-${shootId}`}
                            upper
                            placeholder={t("type")}
                            label={t("type")}
                            onSave={(x) => save(v.id, { content_type: x.toUpperCase() })}
                            className={`${inlineCell} text-[12px] font-semibold tracking-[0.08em] text-ink2`}
                          />
                          {/* Video, photo or carousel, in its colour. */}
                          <select
                            value={v.format}
                            disabled={!editable}
                            aria-label={tf(v.format)}
                            onChange={(e) => save(v.id, { format: e.target.value })}
                            style={{ color: FORMAT_COLOR[v.format] }}
                            className={`${inlineCell} cursor-pointer text-[13px] font-semibold disabled:cursor-default`}
                          >
                            {FORMATS.map((f) => (
                              <option key={f} value={f}>{tf(f)}</option>
                            ))}
                          </select>
                        </div>
                        {v.script_decision && (
                          <span className="block px-2">
                            <ScriptDecisionBadge decision={v.script_decision} />
                          </span>
                        )}
                        <TaskLink id={v.id} tabIndex={-1} className="mt-1 block rounded-sm px-2 py-1.5 hover:bg-hover">
                          {v.script.some((sec) => sec.text.trim()) ? (
                            <ScriptPreview sections={v.script} short={!scriptFull(v.id)} />
                          ) : (
                            <span className="text-[14px] text-ink3">{editable ? t("addScript") : "—"}</span>
                          )}
                        </TaskLink>
                        {v.script.filter((sec) => sec.text.trim()).length > 1 && (
                          <button
                            type="button"
                            onClick={() => setScriptFlip((cur) => ({ ...cur, [v.id]: !cur[v.id] }))}
                            className="cursor-pointer self-start px-2 text-[13px] font-medium text-rust-ink hover:underline"
                          >
                            {scriptFull(v.id) ? `▴ ${t("scriptLess")}` : `▾ ${t("scriptMore")}`}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        {/* The whole note with "Whole scripts", the start of a long one with "Just the start" (▾ for the rest). */}
                        <TextCell value={v.note ?? ""} disabled={!editable} empty={editable ? t("addNote") : null} onSave={(x) => save(v.id, { note: x })} render={(val) => (
                            <div className={scriptFull(v.id) ? "" : "max-h-[120px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"}>
                              <Linkified text={val} />
                            </div>
                          )} />
                        {!scriptFull(v.id) && (v.note?.length ?? 0) > 160 && (
                          <button
                            type="button"
                            onClick={() => setScriptFlip((cur) => ({ ...cur, [v.id]: !cur[v.id] }))}
                            className="cursor-pointer self-start px-2 text-[13px] font-medium text-rust-ink hover:underline"
                          >
                            ▾ {t("noteMore")}
                          </button>
                        )}
                        {/* The reference under the note, so the note lines up with the title. */}
                        <TextCell
                          value={v.reference_url ?? ""}
                          disabled={!editable}
                          singleLine
                          placeholder="https://…"
                          empty={editable ? t("addReference") : null}
                          onSave={(x) => save(v.id, { reference_url: x })}
                          render={(val) => <LinkPreview url={val} />}
                        />
                      </div>
                    </td>
                    <td className="px-1 py-3">
                      {editable && (
                        <button
                          type="button"
                          aria-label={t("remove")}
                          title={t("remove")}
                          onClick={() => startTransition(async () => { await removeFromShoot(v.id); })}
                          className="grid size-8 cursor-pointer place-items-center rounded-sm text-[16px] text-ink3 hover:bg-hover hover:text-red-ink"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-line bg-chip">
                      <td />
                      <td colSpan={3} className="px-4 pb-5 pt-1">
                        <div className="flex max-w-[76ch] flex-col gap-3">
                          {!scriptFull(v.id) && <ScriptPreview sections={v.script} />}
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

/**
 * The script as one readable document: each part's name in a quiet grey gutter (Hook, Body 1, CTA), the words in
 * full ink at reading size, a hairline between parts. `short`: just the first part, two lines.
 */
export function ScriptPreview({ sections, short = false }: { sections: ScriptSection[]; short?: boolean }) {
  const t = useTranslations("shootSheet");
  const filled = sections.filter((s) => s.text.trim() || s.label.trim());
  if (!filled.length) return <span className="text-[14px] text-ink3">{t("empty")}</span>;
  if (short) {
    const s = filled[0];
    return (
      <div className="line-clamp-2 text-[15px] leading-[1.55]">
        <ScriptLabel label={s.label} className="mr-2" />
        <span className="text-ink">{s.text}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {filled.map((s, i) => (
        <div key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-t border-line py-2.5 first:border-t-0 first:pt-0 last:pb-0">
          <ScriptLabel label={s.label} />
          <span className={`whitespace-pre-wrap text-[15px] leading-[1.55] text-ink ${s.label.trim() ? "" : "col-span-2"}`}>{s.text}</span>
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
    <span className="whitespace-pre-wrap break-words text-[14px] leading-normal text-ink2">
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
  label,
  className = cell,
}: {
  value: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  list?: string;
  upper?: boolean;
  label?: string;
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
      placeholder={disabled ? undefined : placeholder}
      aria-label={label}
      // Where field-sizing isn't supported (Firefox, older Safari), size keeps the field about as wide as its text.
      size={Math.max(v.length, placeholder?.length ?? 0, 4)}
      list={list}
      onChange={(e) => setV(upper ? e.target.value.toUpperCase() : e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={className}
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
  empty,
}: {
  value: string;
  onSave: (v: string) => void;
  render: (value: string) => React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  singleLine?: boolean;
  /** Shown instead of the value when there is none ("+ Add a note"); null shows nothing. */
  empty?: string | null;
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
        className={`rounded-sm px-2 py-1.5 ${disabled ? "" : "cursor-text hover:bg-hover"}`}
      >
        {!value.trim() && empty !== undefined ? (empty && <span className="text-[13px] text-ink3 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">{empty}</span>) : render(value)}
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
