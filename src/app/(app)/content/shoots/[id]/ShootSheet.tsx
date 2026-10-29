"use client";

import { ScriptDecisionBadge } from "@/components/tasks/ScriptDecisionBadge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { createTask, setShotStatus, updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { idsByTime } from "@/lib/script-text";
import type { ScriptSection, ShotStatus, Task } from "@/lib/tasks";
import { removeFromShoot, reorderShoot } from "../actions";
import { FORMATS, FORMAT_COLOR } from "@/lib/formats";

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
  allIds,
  tags,
  editable,
}: {
  shootId: string;
  clientId: string;
  videos: Task[];
  /** The whole day's running order, when some formats are hidden: moves keep the hidden ones in place. */
  allIds?: string[];
  tags: string[];
  editable: boolean;
}) {
  const t = useTranslations("shootSheet");
  const tf = useTranslations("format");
  const router = useRouter();
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
      router.refresh();
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
      router.refresh();
    });
  };

  // Saves the running order as the times written in the sheet (untimed videos go last).
  const orderByTime = () => {
    const ids = idsByTime(ordered);
    setSort("manual");
    startTransition(async () => {
      reorder(ids);
      await reorderShoot(shootId, withHidden(ids));
      router.refresh();
    });
  };

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
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-ink3">{t("sortBy")}</span>
        <div className="inline-flex gap-0.5 rounded-[7px] border border-line2 p-[3px]">
          {(["manual", "time", "status", "person", "type"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`h-8 cursor-pointer rounded-[5px] px-3 text-[13px] font-medium ${sort === k ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
            >
              {t(`sort.${k}`)}
            </button>
          ))}
        </div>
        {sort !== "manual" && <span className="text-[13px] text-ink3">{t("sortViewOnly")}</span>}
        <div className="inline-flex gap-0.5 rounded-[7px] border border-line2 p-[3px]">
          {([true, false] as const).map((full) => (
            <button
              key={String(full)}
              type="button"
              onClick={() => setAllScripts(full)}
              className={`h-8 cursor-pointer rounded-[5px] px-3 text-[13px] font-medium ${fullScripts === full && !Object.keys(scriptFlip).length ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
            >
              {t(full ? "scriptsFull" : "scriptsShort")}
            </button>
          ))}
        </div>
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
        <table className="snf-rows w-full min-w-[1040px] table-fixed text-left">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.12em] text-ink3">
              {/* Script gets whatever is left: title sits above it, type under the person. */}
              <th className="w-[60px] px-3 py-2.5">#</th>
              <th className="w-[120px] px-2 py-2.5">{t("status")}</th>
              <th className="w-[68px] px-2 py-2.5">{t("time")}</th>
              <th className="w-[140px] px-2 py-2.5">
                {t("person")} · {t("type")}
              </th>
              <th className="px-2 py-2.5">
                {t("title")} · {t("text")}
              </th>
              <th className="w-[84px] px-2 py-2.5">{t("reference")}</th>
              <th className="w-[22%] px-2 py-2.5">{t("note")}</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {shown.map((v, i) => {
              const status = (v.shot_status ?? "to_shoot") as ShotStatus;
              const isOpen = open === v.id;
              const toggle = () => setOpen(isOpen ? null : v.id);
              return (
                <Fragment key={v.id}>
                  <tr className={`align-top ${isOpen ? "[&>td]:bg-chip" : ""}`}>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        {editable && sort === "manual" && (
                          <span className="flex flex-col">
                            <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(v.id, -1)} className="h-4 cursor-pointer px-0.5 text-[12px] leading-none text-ink3 hover:text-ink disabled:opacity-25">▲</button>
                            <button type="button" aria-label={t("moveDown")} disabled={i === shown.length - 1} onClick={() => move(v.id, 1)} className="h-4 cursor-pointer px-0.5 text-[12px] leading-none text-ink3 hover:text-ink disabled:opacity-25">▼</button>
                          </span>
                        )}
                        <button type="button" onClick={toggle} title={isOpen ? t("collapse") : t("expand")} className="cursor-pointer text-[13px] text-ink3 hover:text-ink">
                          {i + 1}
                          <span className="ml-1 text-[12px]">{isOpen ? "−" : "+"}</span>
                        </button>
                      </div>
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
                      <InputCell value={v.shoot_time ?? ""} disabled={!editable} placeholder="—" onSave={(x) => saveTime(v, x)} className="font-semibold" />
                    </td>
                    <td className="px-1 py-1">
                      <InputCell value={v.on_camera ?? ""} disabled={!editable} onSave={(x) => save(v.id, { on_camera: x })} />
                      <InputCell
                        value={v.content_type ?? ""}
                        disabled={!editable}
                        list={`tags-${shootId}`}
                        upper
                        placeholder={t("type")}
                        onSave={(x) => save(v.id, { content_type: x.toUpperCase() })}
                        className="text-[12px] text-ink3"
                      />
                      {/* Video, photo or carousel, in its colour. */}
                      <select
                        value={v.format}
                        disabled={!editable}
                        aria-label={tf(v.format)}
                        onChange={(e) => save(v.id, { format: e.target.value })}
                        style={{ color: FORMAT_COLOR[v.format] }}
                        className="w-full cursor-pointer bg-transparent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] outline-none disabled:cursor-default"
                      >
                        {FORMATS.map((f) => (
                          <option key={f} value={f}>{tf(f)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      {/* Title and script open the video's own editor (the same panel as everywhere), so the
                          script's parts are edited one by one and never get mixed up in a single text box. */}
                      <TaskLink id={v.id} className="block rounded-[5px] px-2 py-1 hover:bg-hover">
                        <span className="block text-[15px] font-semibold leading-snug">{v.title}</span>
                        {v.script_decision && (
                          <span className="block pt-1">
                            <ScriptDecisionBadge decision={v.script_decision} />
                          </span>
                        )}
                        <span className="block pt-1">
                          {v.script.some((sec) => sec.text.trim()) ? (
                            <ScriptPreview sections={v.script} clamp short={!scriptFull(v.id)} />
                          ) : (
                            <span className="text-[13px] text-ink3">{editable ? t("addScript") : "—"}</span>
                          )}
                        </span>
                      </TaskLink>
                      {v.script.filter((sec) => sec.text.trim()).length > 1 && (
                        <button
                          type="button"
                          onClick={() => setScriptFlip((cur) => ({ ...cur, [v.id]: !cur[v.id] }))}
                          className="cursor-pointer px-2 pb-1 text-[13px] font-medium text-rust-ink hover:underline"
                        >
                          {scriptFull(v.id) ? `▴ ${t("scriptLess")}` : `▾ ${t("scriptMore")}`}
                        </button>
                      )}
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
                      {/* The whole note with "Whole scripts", the start of a long one with "Just the start" (▾ for the rest). */}
                      <TextCell value={v.note ?? ""} disabled={!editable} onSave={(x) => save(v.id, { note: x })} render={(val) => (
                          <div className={`text-[13px] leading-snug ${scriptFull(v.id) ? "" : "max-h-[110px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"}`}>
                            <Linkified text={val} />
                          </div>
                        )} />
                      {!scriptFull(v.id) && (v.note?.length ?? 0) > 160 && (
                        <button
                          type="button"
                          onClick={() => setScriptFlip((cur) => ({ ...cur, [v.id]: !cur[v.id] }))}
                          className="cursor-pointer px-2 pb-1 text-[13px] font-medium text-rust-ink hover:underline"
                        >
                          ▾ {t("noteMore")}
                        </button>
                      )}
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
                      <td colSpan={7} className="px-2 pb-5 pt-1">
                        <div className="flex max-w-[720px] flex-col gap-3">
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
 * HOOK / CTA / BODY with the label set off in the accent color.
 * `clamp`: the compact in-row style; `short`: just the first part, two lines.
 */
export function ScriptPreview({ sections, clamp = false, short = false }: { sections: ScriptSection[]; clamp?: boolean; short?: boolean }) {
  const t = useTranslations("shootSheet");
  const filled = sections.filter((s) => s.text.trim() || s.label.trim());
  if (!filled.length) return <span className="text-[14px] text-ink3">{t("empty")}</span>;
  if (short) {
    const s = filled[0];
    return (
      <div className="line-clamp-2 text-[14px] leading-snug">
        {s.label && <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{s.label}</span>}
        <span className="text-ink2">{s.text}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {filled.map((s, i) => (
        <div key={i} className={clamp ? "text-[14px] leading-snug" : "grid grid-cols-[84px_minmax(0,1fr)] gap-3"}>
          {s.label && (
            <span className={`font-semibold uppercase tracking-[0.12em] text-accent ${clamp ? "mr-1.5 text-[11px]" : "pt-[3px] text-[11px]"}`}>{s.label}</span>
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
        className={`min-h-[34px] rounded px-2 py-1.5 ${disabled ? "" : "cursor-text hover:bg-hover"}`}
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
