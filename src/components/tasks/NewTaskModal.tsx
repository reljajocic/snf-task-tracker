"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { addClientContentType } from "@/app/(app)/clients/actions";
import { createTask } from "@/app/(app)/task-actions";
import { Button } from "@/components/ui/Button";
import type { Lookups } from "@/lib/data";
import { formatDate, type IsoDate } from "@/lib/dates";
import { SCRIPT_SECTIONS, parseEstimate, type ScriptSection, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/tasks";
import { Pill } from "./bits";
import { MonthGrid, quickDates } from "./DatePicker";
import { ClientProjectSelects, PeoplePicker, assignablePeople, PriorityPicker, StatusPicker, TypePicker, inputClass } from "./fields";

type Defaults = {
  client_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  status?: TaskStatus;
  kind?: "task" | "video";
  publish_date?: string | null;
  shoot_id?: string | null;
  profile?: string | null;
};

/**
 * New task: 760px modal (3b) / full-screen sheet on mobile (3d).
 * New video: a wide two-column modal — details on the left, script and notes on the right.
 * Videos skip deadline/status/priority: those matter once the video moves to edit.
 */
export function NewTaskModal({ lookups, today, defaults, onClose }: { lookups: Lookups; today: IsoDate; defaults: Defaults; onClose: () => void }) {
  const t = useTranslations("task");
  const tv = useTranslations("video");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"task" | "video">(defaults.kind ?? "task");
  const [where, setWhere] = useState({ client_id: defaults.client_id ?? null, project_id: defaults.project_id ?? null });
  const [assignees, setAssignees] = useState<string[]>([lookups.me.id]);
  const [drive, setDrive] = useState("");
  // Task fields
  const [due, setDue] = useState<IsoDate | null>(defaults.due_date ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(defaults.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [type, setType] = useState<TaskType | null>(null);
  const [estimate, setEstimate] = useState("");
  const [description, setDescription] = useState("");
  // Video fields
  const [contentType, setContentType] = useState<string | null>(null);
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState<string | null>(null);
  const [onCamera, setOnCamera] = useState("");
  const [location, setLocation] = useState("");
  const [profile, setProfile] = useState(defaults.profile ?? "");
  const [script, setScript] = useState<ScriptSection[]>(SCRIPT_SECTIONS.map((label) => ({ label, text: "" })));
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const client = lookups.clients.find((c) => c.id === where.client_id);
  const needsProject = Boolean(client && !client.isTeam && !where.project_id);
  const canSave = title.trim().length > 0 && !needsProject && !pending;
  const isVideo = kind === "video";
  const tags = [...(client?.contentTypes ?? []), ...extraTags.filter((x) => !client?.contentTypes.includes(x))];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = () =>
    startTransition(async () => {
      if (isVideo && client && contentType && !client.contentTypes.includes(contentType)) {
        await addClientContentType(client.id, contentType);
      }
      const res = await createTask(
        isVideo
          ? {
              title,
              kind,
              ...where,
              assignee_ids: assignees,
              content_type: contentType,
              on_camera: onCamera,
              location,
              profile: client?.profiles.includes(profile) ? profile : null,
              script: script.filter((s) => s.text.trim()),
              note,
              reference_url: reference,
              drive_url: drive,
              publish_date: defaults.publish_date ?? null,
              shoot_id: defaults.shoot_id ?? null,
            }
          : {
              title,
              kind,
              ...where,
              assignee_ids: assignees,
              due_date: due,
              status,
              priority,
              type,
              estimate_minutes: parseEstimate(estimate),
              drive_url: drive,
              description,
            },
      );
      if (!res.ok) return setError(t("saveFailed", { message: res.error }));
      onClose();
      router.refresh();
    });

  const label = (text: string) => <span className="text-[13px] font-medium text-ink3">{text}</span>;
  const textareaClass =
    "w-full resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-accent";

  const kindSwitch = (
    <div className="inline-flex gap-0.5 rounded-[7px] border border-line2 p-[3px]">
      {(["task", "video"] as const).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={kind === k}
          onClick={() => setKind(k)}
          className={`h-8 cursor-pointer rounded-[5px] px-3.5 text-[13px] font-medium ${kind === k ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
        >
          {tv(k)}
        </button>
      ))}
    </div>
  );

  const titleInput = (
    <input
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder={isVideo ? tv("titlePlaceholder") : t("titlePlaceholder")}
      className="w-full border-0 border-b border-accent bg-transparent py-2 text-[20px] font-medium leading-tight text-ink outline-none placeholder:text-ink3 focus-visible:shadow-none lg:text-[24px]"
    />
  );

  const shared = (
    <>
      <ClientProjectSelects layout="grid" clients={lookups.clients} clientId={where.client_id} projectId={where.project_id} onChange={setWhere} />
      {needsProject && <p className="text-[13px] text-rust-ink sm:col-span-2">{t("pickProject")}</p>}
      <div className="flex flex-col gap-2 sm:col-span-2">
        {label(t("fields.assignees"))}
        <PeoplePicker size="lg" people={assignablePeople(lookups, where.client_id, assignees)} value={assignees} onChange={setAssignees} />
      </div>
    </>
  );

  const videoFields = (
    <>
      <div className="flex flex-col gap-2 sm:col-span-2">
        {label(tv("contentType"))}
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((ct) => (
            <Pill key={ct} size="lg" selected={contentType === ct} onClick={() => setContentType(contentType === ct ? null : ct)}>
              {ct}
            </Pill>
          ))}
          {tagDraft === null ? (
            client && (
              <button type="button" onClick={() => setTagDraft("")} className="h-[38px] cursor-pointer rounded-full border border-dashed border-line2 px-3.5 text-[14px] text-ink3 hover:text-ink">
                {tv("addTag")}
              </button>
            )
          ) : (
            <input
              autoFocus
              value={tagDraft}
              placeholder={tv("tagPlaceholder")}
              onChange={(e) => setTagDraft(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = tagDraft.trim();
                  if (v) {
                    setExtraTags((cur) => (cur.includes(v) ? cur : [...cur, v]));
                    setContentType(v);
                  }
                  setTagDraft(null);
                }
                if (e.key === "Escape") setTagDraft(null);
              }}
              onBlur={() => setTagDraft(null)}
              className="h-[38px] w-32 rounded-full border border-accent bg-transparent px-3.5 text-[14px] uppercase text-ink outline-none"
            />
          )}
        </div>
        {client && !tags.length && tagDraft === null && <span className="text-[12px] text-ink3">{tv("noTags")}</span>}
      </div>
      <label className="flex flex-col gap-2">
        {label(tv("onCamera"))}
        <input value={onCamera} onChange={(e) => setOnCamera(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-2">
        {label(tv("location"))}
        <input value={location} onChange={(e) => setLocation(e.target.value)} list="new-task-locations" className={inputClass} />
        <datalist id="new-task-locations">{client?.locations.map((l) => <option key={l} value={l} />)}</datalist>
      </label>
      {client && client.profiles.length > 0 && (
        <label className="flex flex-col gap-2">
          {label(tv("profile"))}
          <select value={profile} onChange={(e) => setProfile(e.target.value)} className={`${inputClass} cursor-pointer`}>
            <option value="">—</option>
            {client.profiles.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-2">
        {label(tv("referenceLabel"))}
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="https://tiktok.com/…" className={inputClass} />
      </label>
      <label className="flex flex-col gap-2">
        {label(t("fields.driveLink"))}
        <input value={drive} onChange={(e) => setDrive(e.target.value)} placeholder="drive.google.com/…" className={inputClass} />
      </label>
      <p className="text-[12.5px] leading-snug text-ink3 sm:col-span-2">{tv("laterHint")}</p>
    </>
  );

  const scriptColumn = (
    <div className="flex min-h-0 flex-col gap-4 lg:h-full">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{tv("script")}</span>
        <button type="button" onClick={() => setScript((cur) => [...cur, { label: "", text: "" }])} className="cursor-pointer text-[13px] font-medium text-rust-ink">
          {tv("addSection")}
        </button>
      </div>
      <span className="-mt-2 text-[12.5px] text-ink3">{tv("scriptHint")}</span>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        {script.map((s, i) => (
          <div key={i} className="group relative grid grid-cols-1 gap-1 rounded-md border border-line px-3.5 pb-3 pr-11 pt-2 focus-within:border-line2 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-3 sm:px-3 sm:py-2.5 sm:pr-8">
            <button
              type="button"
              aria-label={tv("removeSection")}
              title={tv("removeSection")}
              onClick={() => setScript((cur) => cur.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 grid size-9 cursor-pointer place-items-center text-[18px] leading-none text-ink3 opacity-60 hover:text-red-ink hover:opacity-100 sm:right-0.5 sm:top-0.5 sm:size-7 sm:text-[16px]"
            >
              ×
            </button>
            <input
              value={s.label}
              placeholder={tv("sectionLabel")}
              onChange={(e) => setScript((cur) => cur.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className="h-9 border-0 bg-transparent text-[13px] font-semibold uppercase tracking-[0.14em] text-accent outline-none placeholder:text-ink3 focus-visible:shadow-none sm:h-7 sm:text-[11px]"
            />
            <textarea
              value={s.text}
              rows={Math.max(2, Math.ceil(s.text.length / 55))}
              onChange={(e) => setScript((cur) => cur.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              className="min-h-[96px] resize-y border-0 bg-transparent py-1 text-[16px] leading-relaxed text-ink outline-none [field-sizing:content] focus-visible:shadow-none sm:min-h-0 sm:text-[14px]"
            />
          </div>
        ))}
      </div>
      <label className="flex flex-col gap-2">
        <span className="eyebrow">{tv("notesLabel")}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder={tv("notesPlaceholder")} className={textareaClass} />
      </label>
    </div>
  );

  const taskFields = (
    <>
      <div className="flex flex-col gap-2 sm:col-span-2">
        {label(t("fields.due"))}
        <div className="flex flex-wrap items-center gap-1.5">
          {quickDates(today).map((q) => (
            <Pill key={q.key} size="lg" selected={due === q.date} onClick={() => setDue(due === q.date ? null : q.date)}>
              {t(`quick.${q.key}`)}
            </Pill>
          ))}
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            aria-expanded={pickerOpen}
            className={`h-[38px] cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-[14px] font-semibold ${
              due && !quickDates(today).some((q) => q.date === due) ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink"
            }`}
          >
            {due ? formatDate(due) : t("pickDate")} ▾
          </button>
          {due && (
            <button type="button" onClick={() => setDue(null)} className="cursor-pointer px-2 text-[13px] text-ink3 hover:text-ink">
              {t("quick.clear")}
            </button>
          )}
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
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("descriptionPlaceholder")} className={textareaClass} />
      </label>
    </>
  );

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
        className={`relative flex h-full w-full flex-col overflow-hidden bg-bg lg:rounded-[10px] lg:border lg:border-line2 lg:shadow-[0_30px_80px_rgba(0,0,0,0.45)] ${
          isVideo ? "lg:h-[calc(100dvh-48px)] lg:w-[min(1200px,calc(100vw-48px))]" : "lg:h-auto lg:max-h-[calc(100dvh-48px)] lg:w-[760px]"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-6 lg:px-7 lg:pt-[22px]">
          <div className="flex items-center gap-4">
            <h2 className="display whitespace-nowrap text-[22px] leading-tight">{isVideo ? tv("newTitle") : t("new")}</h2>
            {kindSwitch}
          </div>
          <button type="button" aria-label={t("cancel")} onClick={onClose} className="size-[34px] cursor-pointer rounded-md text-[22px] text-ink2 hover:text-ink">
            ×
          </button>
        </div>

        {isVideo ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:overflow-hidden">
            <div className="flex flex-col gap-5 px-5 pb-6 pt-[18px] lg:overflow-auto lg:px-7">
              {titleInput}
              <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
                {shared}
                {videoFields}
              </div>
            </div>
            <div className="flex min-h-0 flex-col border-line px-5 pb-6 pt-[18px] lg:border-l lg:px-7">{scriptColumn}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 overflow-auto px-5 pb-6 pt-[18px] lg:px-7">
            {titleInput}
            <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
              {shared}
              {taskFields}
            </div>
          </div>
        )}
        {error && <p role="alert" className="mx-5 mb-3 rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-ink lg:mx-7">{error}</p>}

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
