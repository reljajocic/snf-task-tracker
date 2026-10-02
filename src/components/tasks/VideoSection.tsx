"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { addSubtask, listSubtasks, updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import { Avatar } from "@/components/ui/Avatar";
import type { Lookups } from "@/lib/data";
import { formatDate, weekdayIndex, type IsoDate } from "@/lib/dates";
import { PHASES, PUBLISHED_PHASE, SCRIPT_SECTIONS, type ScriptSection, type Task } from "@/lib/tasks";
import { Pill } from "./bits";
import { DatePicker } from "./DatePicker";
import { TaskLink } from "./links";

type Save = (patch: TaskPatch, optimistic?: Partial<Task>) => void;

/** Video part of the task panel (design 4b / 4d). */
export function VideoSection({
  task,
  lookups,
  today,
  disabled,
  save,
  onChanged,
}: {
  task: Task;
  lookups: Lookups;
  today: IsoDate;
  disabled: boolean;
  save: Save;
  onChanged: () => void;
}) {
  const t = useTranslations();
  const phase = task.phase ?? 0;
  const client = lookups.clients.find((c) => c.id === task.client?.id);
  const types = client?.contentTypes.length ? client.contentTypes : ["FUN", "INFO", "GYM", "UGC", "PROMO"];
  const next = phase < PUBLISHED_PHASE ? phase + 1 : null;

  return (
    <div className="flex flex-col gap-[26px]">
      {/* Phase stepper */}
      <div className="flex flex-col gap-3.5 rounded-lg border border-line bg-surf px-5 py-[18px]">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{t("video.phase")}</span>
          {next !== null && !disabled && (
            <button
              type="button"
              onClick={() => save({ phase: next }, { phase: next })}
              className="h-[34px] cursor-pointer whitespace-nowrap rounded-md border border-line2 px-3 text-[13px] font-medium text-ink hover:border-ink"
            >
              {next === PUBLISHED_PHASE ? t("phase.markPublished") : t("phase.moveTo", { phase: t(`phase.${PHASES[next]}`) })} →
            </button>
          )}
        </div>
        <div className="flex items-start">
          {PHASES.map((p, i) => {
            const done = phase > i;
            const current = phase === i;
            return (
              <div key={p} className="flex flex-1 items-start last:flex-none">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => save({ phase: i }, { phase: i })}
                  className="flex w-[64px] flex-none cursor-pointer flex-col items-center gap-2 disabled:cursor-default sm:w-[72px]"
                >
                  <span
                    className={`grid size-8 place-items-center rounded-full border-[1.5px] text-[13px] font-semibold ${
                      current ? "border-accent bg-accent text-charcoal" : done ? "border-ink2 bg-ink2 text-bg" : "border-line2 text-ink3"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`whitespace-nowrap text-[12px] font-medium sm:text-[13px] ${current ? "text-ink" : done ? "text-ink2" : "text-ink3"}`}>
                    {t(`phase.${p}`)}
                  </span>
                </button>
                {i < PHASES.length - 1 && <span className="mt-4 h-[1.5px] flex-1" style={{ background: done ? "var(--ink2)" : "var(--line2)" }} />}
              </div>
            );
          })}
        </div>
        {phase >= PUBLISHED_PHASE && (
          <span className="text-[13px] font-medium text-[var(--status-done)]">
            {t("phase.published")}
            {task.published_at ? ` · ${formatDate(task.published_at)}` : ""}
          </span>
        )}
      </div>

      {/* Facts grid */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        <Fact label={t("video.onCamera")}>
          <InlineText value={task.on_camera} disabled={disabled} onSave={(v) => save({ on_camera: v }, { on_camera: v || null })} />
        </Fact>
        <Fact label={t("video.location")}>
          <InlineText
            value={task.location}
            disabled={disabled}
            list={client?.locations}
            onSave={(v) => save({ location: v }, { location: v || null })}
          />
        </Fact>
        <Fact label={t("video.shoot")}>
          {task.shoot ? (
            <Link href={`/content/shoots/${task.shoot.id}`} className="text-[15px] font-medium hover:underline">
              {formatDate(task.shoot.date)}
              {task.shoot_time ? ` · ${task.shoot_time}` : ""} <span className="text-rust-ink">↗</span>
            </Link>
          ) : (
            <span className="text-[14px] text-ink3">{t("video.noShoot")}</span>
          )}
        </Fact>
        <Fact label={t("video.publish")}>
          <div className="flex items-center gap-2">
            <DatePicker
              value={task.publish_date}
              today={today}
              disabled={disabled}
              emptyLabel={t("video.noPublish")}
              onChange={(d) => save({ publish_date: d }, { publish_date: d })}
            />
            {task.publish_date && (
              <span className="text-[13px] text-ink3">{t("weekday.short", { day: String(weekdayIndex(task.publish_date)) })}</span>
            )}
          </div>
        </Fact>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">{t("video.contentType")}</span>
        <div className="flex flex-wrap gap-1.5">
          {types.map((ct) => (
            <Pill key={ct} disabled={disabled} selected={task.content_type === ct} onClick={() => save({ content_type: task.content_type === ct ? null : ct }, { content_type: task.content_type === ct ? null : ct })}>
              {ct}
            </Pill>
          ))}
        </div>
      </div>

      <Subtasks task={task} lookups={lookups} disabled={disabled} onChanged={onChanged} />

      <ScriptEditor task={task} disabled={disabled} save={save} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                href={task.reference_url.startsWith("http") ? task.reference_url : `https://${task.reference_url}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-[30px] items-center rounded-[5px] bg-chip px-2.5 text-[13px] font-medium"
              >
                ↗
              </a>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-2.5">
          <span className="eyebrow">{t("video.note")}</span>
          <div className="flex h-[42px] items-center rounded-md border border-line2 px-3 focus-within:border-accent">
            <InlineText bare value={task.note} placeholder={t("video.notePlaceholder")} disabled={disabled} onSave={(v) => save({ note: v }, { note: v || null })} />
          </div>
        </label>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[7px] bg-bg px-4 py-3.5">
      <span className="text-[12px] font-medium text-ink3">{label}</span>
      {children}
    </div>
  );
}

/** Text that saves on blur/Enter. */
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
                  className={`grid size-6 cursor-pointer place-items-center rounded-[5px] border-[1.5px] text-[13px] font-bold text-ink-black ${
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
            {lookups.people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 rounded-md border border-line2 bg-transparent px-2 text-[14px] text-ink" />
          <button type="submit" disabled={pending || !title.trim()} className="h-9 cursor-pointer rounded-md bg-accent px-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-charcoal disabled:opacity-45">
            {t("video.addSubtaskSave")}
          </button>
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
      <div className="flex items-baseline">
        <span className="eyebrow">{t("script")}</span>
        {!disabled && (
          <button type="button" onClick={() => setSections((cur) => [...cur, { label: "", text: "" }])} className="ml-auto cursor-pointer text-[13px] font-medium text-rust-ink">
            {t("addSection")}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {sections.map((s, i) => (
          <div key={i} className="group grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-md border border-line px-3 py-2.5 focus-within:border-line2">
            <input
              value={s.label}
              disabled={disabled}
              placeholder={t("sectionLabel")}
              onChange={(e) => update(i, { label: e.target.value })}
              onBlur={() => commit(sections)}
              className="h-7 border-0 bg-transparent text-[11px] font-semibold uppercase tracking-[0.14em] text-accent outline-none placeholder:text-ink3 focus-visible:shadow-none"
            />
            <textarea
              value={s.text}
              disabled={disabled}
              rows={Math.max(1, Math.ceil(s.text.length / 60))}
              onChange={(e) => update(i, { text: e.target.value })}
              onBlur={() => commit(sections)}
              className="min-h-7 resize-y border-0 bg-transparent py-1 text-[14px] leading-relaxed text-ink2 outline-none focus-visible:shadow-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
