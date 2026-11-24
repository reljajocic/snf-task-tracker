"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { addSubtask, listSubtasks, updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import { Avatar } from "@/components/ui/Avatar";
import type { Lookups } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { pendingReshoot, SCRIPT_SECTIONS, type ScriptSection, type Task } from "@/lib/tasks";
import { Pill } from "./bits";
import { assignablePeople, FieldRow } from "./fields";
import { TaskLink } from "./links";
import { ReshootBadge, ShootHistory } from "./Reshoot";
import { ReviewSection } from "./ReviewSection";
import { ScriptDecisionBadge } from "./ScriptDecisionBadge";
import { ScriptFields } from "./ScriptFields";
import { safeHref } from "@/lib/safe-url";
import { FORMATS, FORMAT_COLOR, typeColor } from "@/lib/formats";
import { Button } from "@/components/ui/Button";

type Save = (patch: TaskPatch, optimistic?: Partial<Task>) => void;

/** A one-line text field inside a field row: saves on blur or Enter. */
const box = "flex h-9 items-center gap-2 rounded-md border border-line2 pl-3 pr-1 focus-within:border-accent";

/**
 * Video parts of the task window. The window lays every item out the same way (status in the header; then dates,
 * people, details; the words on the right), and asks this for the video's own pieces:
 * "details" (rows in the Details list), "extras" (reshoot, subtasks, review) and "text" (script, notes, reference).
 */
export function VideoSection({
  task,
  lookups,
  disabled,
  save,
  onChanged,
  part,
}: {
  task: Task;
  lookups: Lookups;
  disabled: boolean;
  save: Save;
  onChanged: () => void;
  part: "details" | "extras" | "text";
}) {
  const t = useTranslations();
  const client = lookups.clients.find((c) => c.id === task.client?.id);
  const types = client?.contentTypes.length ? client.contentTypes : ["FUN", "INFO", "GYM", "UGC", "PROMO"];

  if (part === "details") {
    return (
      <>
        <FieldRow label={t("video.formatLabel")} top>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <Pill key={f} disabled={disabled} selected={task.format === f} onClick={() => save({ format: f }, { format: f })}>
                <span className="size-2 rounded-full" style={{ background: FORMAT_COLOR[f] }} />
                {t(`format.${f}`)}
              </Pill>
            ))}
          </div>
        </FieldRow>
        <FieldRow label={t("video.contentType")} top>
          <div className="flex flex-wrap gap-1.5">
            {types.map((ct) => (
              <Pill key={ct} disabled={disabled} selected={task.content_type === ct} onClick={() => save({ content_type: task.content_type === ct ? null : ct }, { content_type: task.content_type === ct ? null : ct })}>
                <span className="size-2 rounded-full" style={{ background: typeColor(ct) }} />
                {ct}
              </Pill>
            ))}
          </div>
        </FieldRow>
        <FieldRow label={t("video.onCamera")}>
          <div className={box}>
            <InlineText bare value={task.on_camera} disabled={disabled} onSave={(v) => save({ on_camera: v }, { on_camera: v || null })} />
          </div>
        </FieldRow>
        <FieldRow label={t("video.location")}>
          <div className={box}>
            <InlineText bare value={task.location} disabled={disabled} list={client?.locations} onSave={(v) => save({ location: v }, { location: v || null })} />
          </div>
        </FieldRow>
        {client && client.profiles.length > 0 && (
          <FieldRow label={t("video.profile")}>
            <select
              value={task.profile ?? ""}
              disabled={disabled}
              onChange={(e) => save({ profile: e.target.value || null }, { profile: e.target.value || null })}
              className="h-9 cursor-pointer appearance-none rounded-md border border-line2 bg-transparent bg-[url(/brand/chevron.svg)] bg-[length:10px] bg-[right_12px_center] bg-no-repeat pl-3 pr-8 text-[14px] font-medium text-ink outline-none focus:border-accent disabled:cursor-default"
            >
              <option value="">—</option>
              {client.profiles.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FieldRow>
        )}
        {/* Once it's out: the post's link, for the client's monthly report. */}
        {(task.phase ?? 0) >= 4 && (
          <FieldRow label={t("video.postUrl")}>
            <div className={box}>
              <InlineText bare value={task.post_url} placeholder={t("video.postUrlPlaceholder")} disabled={disabled} onSave={(v) => save({ post_url: v }, { post_url: v || null })} />
              {task.post_url && (
                <a href={safeHref(task.post_url)} target="_blank" rel="noreferrer" aria-label={t("task.open")} className="flex h-7 items-center rounded-sm bg-chip px-2.5 text-[13px] font-medium">
                  ↗
                </a>
              )}
            </div>
          </FieldRow>
        )}
      </>
    );
  }

  if (part === "extras") {
    return (
      <>
        {pendingReshoot(task) && <ReshootBadge attempt={pendingReshoot(task)!} />}
        <ShootHistory attempts={task.shoot_history} />
        <Subtasks task={task} lookups={lookups} disabled={disabled} onChanged={onChanged} />
        <ReviewSection task={task} disabled={disabled} onChanged={onChanged} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      <ScriptEditor task={task} disabled={disabled} save={save} />

      {/* Notes are read on the shoot day, so they get room: a real box that grows with what's written. */}
      <label className="flex flex-col gap-2.5">
        <span className="eyebrow">{t("video.note")}</span>
        <NoteBox value={task.note} placeholder={t("video.notePlaceholder")} disabled={disabled} onSave={(v) => save({ note: v }, { note: v || null })} />
      </label>

      <div className="grid grid-cols-1 gap-4">
        <label className="flex flex-col gap-2.5">
          <span className="eyebrow">{t("video.reference")}</span>
          <div className="flex h-[42px] items-center gap-2 rounded-md border border-line2 pl-3 pr-1.5 focus-within:border-accent">
            <InlineText
              bare
              value={task.reference_url}
              placeholder={t("video.referencePlaceholder")}
              disabled={disabled}
              onSave={(v) => save({ reference_url: v }, { reference_url: v || null })}
            />
            {task.reference_url && (
              <a
                href={safeHref(task.reference_url)}
                target="_blank"
                rel="noreferrer"
                className="flex h-[30px] items-center rounded-sm bg-chip px-2.5 text-[13px] font-medium"
              >
                ↗
              </a>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

/** Text that saves on blur/Enter. */
function NoteBox({ value, onSave, disabled, placeholder }: { value: string | null; onSave: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  const [v, setV] = useState(value ?? "");
  return (
    <textarea
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      rows={5}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== (value ?? "") && onSave(v)}
      className="min-h-[132px] w-full resize-y rounded-md border border-line2 bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none [field-sizing:content] placeholder:text-ink3 focus:border-accent"
    />
  );
}

function InlineText({
  value,
  onSave,
  disabled,
  placeholder = "—",
  list,
  bare = false,
}: {
  value: string | null;
  onSave: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  list?: string[];
  bare?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  const reactId = useId();
  const id = list ? `dl-${reactId}` : undefined;
  return (
    <>
      <input
        value={v}
        disabled={disabled}
        placeholder={placeholder}
        list={id}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() !== (value ?? "") && onSave(v)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-ink3 focus-visible:shadow-none ${bare ? "text-[14px]" : "text-[15px] font-medium"}`}
      />
      {list && (
        <datalist id={id}>
          {list.map((l) => <option key={l} value={l} />)}
        </datalist>
      )}
    </>
  );
}

function Subtasks({ task, lookups, disabled, onChanged }: { task: Task; lookups: Lookups; disabled: boolean; onChanged: () => void }) {
  const t = useTranslations();
  const [items, setItems] = useState<Task[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    listSubtasks(task.id).then((r) => live && setItems(r));
    return () => {
      live = false;
    };
  }, [task.id, task.subtask_count]);

  const reload = async () => setItems(await listSubtasks(task.id));
  const done = items?.filter((x) => x.status === "done").length ?? 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <span className="eyebrow">{t("video.subtasks")}</span>
        {items && items.length > 0 && <span className="text-[13px] font-medium text-ink3">{t("video.subtasksDone", { done, total: items.length })}</span>}
        {!disabled && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="ml-auto cursor-pointer text-[13px] font-medium text-rust-ink">
            {t("video.addSubtask")}
          </button>
        )}
      </div>
      {items && items.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-lg border border-line">
          {items.map((s) => {
            const isDone = s.status === "done";
            const person = s.assignees[0];
            return (
              <div key={s.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-3.5 py-[11px] last:border-b-0 sm:grid-cols-[28px_minmax(0,1fr)_auto_96px]">
                <button
                  type="button"
                  disabled={disabled || pending}
                  aria-label={s.title}
                  aria-pressed={isDone}
                  onClick={() =>
                    startTransition(async () => {
                      setItems((cur) => cur?.map((x) => (x.id === s.id ? { ...x, status: isDone ? "todo" : "done" } : x)) ?? null);
                      await updateTask(s.id, { status: isDone ? "todo" : "done" });
                      await reload();
                      onChanged();
                    })
                  }
                  className={`grid size-6 cursor-pointer place-items-center rounded-sm border-[1.5px] text-[13px] font-bold text-ink-black ${
                    isDone ? "border-[var(--status-done)] bg-[var(--status-done)]" : "border-line2"
                  }`}
                >
                  {isDone ? "✓" : ""}
                </button>
                <TaskLink id={s.id} className={`truncate text-[15px] font-medium hover:underline ${isDone ? "text-ink3 line-through" : ""}`}>
                  {s.title}
                </TaskLink>
                <span className="flex items-center gap-[7px] text-[13px] font-medium text-ink2">
                  {person && <Avatar person={person} size={24} />}
                  <span className="hidden sm:inline">{person?.full_name.split(" ")[0]}</span>
                </span>
                <span className="hidden justify-self-end whitespace-nowrap text-[13px] font-medium text-ink2 sm:block">{s.due_date ? formatDate(s.due_date) : ""}</span>
              </div>
            );
          })}
        </div>
      )}
      {adding && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-lg border border-line2 p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            startTransition(async () => {
              await addSubtask(task.id, { title, assignee_id: who || null, due_date: due || null });
              setTitle("");
              setWho("");
              setDue("");
              setAdding(false);
              await reload();
              onChanged();
            });
          }}
        >
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("video.subtaskTitle")} className="h-9 min-w-[160px] flex-1 rounded-md border border-line2 bg-transparent px-3 text-[14px] text-ink outline-none focus:border-accent" />
          <select value={who} onChange={(e) => setWho(e.target.value)} className="h-9 rounded-md border border-line2 bg-transparent px-2 text-[14px] text-ink">
            <option value="">—</option>
            {assignablePeople(lookups, task.client?.id).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 rounded-md border border-line2 bg-transparent px-2 text-[14px] text-ink" />
          <Button type="submit" size="xs" disabled={pending || !title.trim()}>
            {t("video.addSubtaskSave")}
          </Button>
          <button type="button" onClick={() => setAdding(false)} className="h-9 cursor-pointer px-2 text-[13px] text-ink3">×</button>
        </form>
      )}
    </div>
  );
}

function ScriptEditor({ task, disabled, save }: { task: Task; disabled: boolean; save: Save }) {
  const t = useTranslations("video");
  const initial: ScriptSection[] = task.script.length ? task.script : SCRIPT_SECTIONS.map((label) => ({ label, text: "" }));
  const [sections, setSections] = useState<ScriptSection[]>(initial);

  const commit = (next: ScriptSection[]) => {
    const cleaned = next.filter((s) => s.label.trim() || s.text.trim());
    if (JSON.stringify(cleaned) !== JSON.stringify(task.script)) save({ script: cleaned }, { script: cleaned });
  };
  const update = (i: number, patch: Partial<ScriptSection>) => setSections((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className="eyebrow">{t("script")}</span>
        <ScriptDecisionBadge decision={task.script_decision} />
        {!disabled && (
          <button type="button" onClick={() => setSections((cur) => [...cur, { label: "", text: "" }])} className="ml-auto cursor-pointer text-[13px] font-medium text-rust-ink">
            {t("addSection")}
          </button>
        )}
      </div>
      <ScriptFields
        sections={sections}
        disabled={disabled}
        onChange={update}
        onBlur={() => commit(sections)}
        onRemove={(i) => {
          const next = sections.filter((_, j) => j !== i);
          setSections(next);
          commit(next);
        }}
      />
    </div>
  );
}
