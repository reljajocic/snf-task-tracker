"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { addClientContentType } from "@/app/(app)/clients/actions";
import { recentShoots } from "@/app/(app)/content/shoots/actions";
import { createTask } from "@/app/(app)/task-actions";
import { Button } from "@/components/ui/Button";
import type { Lookups } from "@/lib/data";
import { daysBetween, formatDate, formatShortDate, weekdayIndex, type IsoDate } from "@/lib/dates";
import { ScriptFields } from "./ScriptFields";
import { SCRIPT_SECTIONS, parseEstimate, type ScriptSection, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/tasks";
import { Pill } from "./bits";
import { MonthGrid, quickDates } from "./DatePicker";
import { ClientProjectSelects, allowedProjects, PeoplePicker, assignablePeople, PriorityPicker, StatusPicker, TypePicker, inputClass } from "./fields";
import { FORMATS, FORMAT_COLOR, typeColor, type PostFormat } from "@/lib/formats";
import { Segmented } from "@/components/ui/Segmented";

type Defaults = {
  client_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  status?: TaskStatus;
  kind?: "task" | "video";
  publish_date?: string | null;
  shoot_id?: string | null;
  profile?: string | null;
  stage?: "idea" | "shot" | "published";
};

/**
 * New task: 760px modal (3b) / full-screen sheet on mobile (3d).
 * New video: a wide two-column modal — details on the left, script and notes on the right.
 * Videos skip deadline/status/priority: those matter once the video moves to edit.
 */
export function NewTaskModal({ lookups, today, defaults, onClose }: { lookups: Lookups; today: IsoDate; defaults: Defaults; onClose: () => void }) {
  const t = useTranslations("task");
  const tv = useTranslations("video");
  const tf = useTranslations("format");
  const tw = useTranslations("weekday");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"task" | "video">(defaults.kind ?? "task");
  // The page's client (posting schedule, video bank, a client page) is only a suggestion: if I'm not on its team
  // and on none of its projects I can't file anything there (RLS refuses it), so the form starts without it and says
  // why, instead of leaving Save greyed out with no way forward. Not on the team but on a project: that project.
  const [blocked] = useState(() => {
    const c = lookups.clients.find((x) => x.id === defaults.client_id);
    return c && !c.isTeam && !allowedProjects(c).length ? c.name : null;
  });
  const [where, setWhere] = useState(() => {
    const c = lookups.clients.find((x) => x.id === defaults.client_id);
    if (!c || blocked) return { client_id: blocked ? null : (defaults.client_id ?? null), project_id: blocked ? null : (defaults.project_id ?? null) };
    const allowed = allowedProjects(c);
    const project = defaults.project_id && (c.isTeam || allowed.some((p) => p.id === defaults.project_id)) ? defaults.project_id : c.isTeam ? null : (allowed[0]?.id ?? null);
    return { client_id: c.id, project_id: project };
  });
  // Tasks start with me on them; a video has one editor and starts without one (set by the client's rules once it's dated).
  const [assignees, setAssignees] = useState<string[]>(defaults.kind === "video" ? [] : [lookups.me.id]);
  const [drive, setDrive] = useState("");
  // Task fields
  const [due, setDue] = useState<IsoDate | null>(defaults.due_date ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(defaults.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [type, setType] = useState<TaskType | null>(null);
  const [estimate, setEstimate] = useState("");
  const [description, setDescription] = useState("");
  // Type, estimate, Drive and description are rarely filled in when a task is created: one click away.
  const [more, setMore] = useState(false);
  // Video fields
  const [contentType, setContentType] = useState<string | null>(null);
  const [format, setFormat] = useState<PostFormat>("video");
  // Where the new video starts: an idea, already filmed (waiting for a date), or already out.
  const [stage, setStage] = useState<"idea" | "shot" | "published">(defaults.stage ?? "idea");
  // Filmed off plan: which of the client's shoots it was filmed on, or another day (a shoot day is made for it).
  const [shoots, setShoots] = useState<{ clientId: string; list: { id: string; date: IsoDate; location: string | null }[] } | null>(null);
  // Neither shoot nor date: not filmed on a shoot (the client sent it, say).
  const [filmedOn, setFilmedOn] = useState<{ clientId: string | null; shoot?: string; date?: IsoDate } | null>(null);
  const [filmedPickerOpen, setFilmedPickerOpen] = useState(false);
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
  const isVideo = kind === "video";
  const tags = [...(client?.contentTypes ?? []), ...extraTags.filter((x) => !client?.contentTypes.includes(x))];

  // From a shoot's page the video is already on that shoot; elsewhere it asks which shoot it was filmed on.
  const asksShoot = isVideo && stage === "shot" && !defaults.shoot_id && !!where.client_id;
  useEffect(() => {
    if (!asksShoot || !where.client_id) return;
    const clientId = where.client_id;
    let live = true;
    recentShoots(clientId, today).then((list) => live && setShoots({ clientId, list }));
    return () => {
      live = false;
    };
  }, [asksShoot, where.client_id, today]);
  // Until the client's shoots are in, nothing is picked (and it can't be saved), so nothing jumps or is guessed.
  const loadingShoots = asksShoot && shoots?.clientId !== where.client_id;
  const canSave = title.trim().length > 0 && !needsProject && !pending && !loadingShoots;
  const recent = shoots?.clientId === where.client_id ? shoots.list : [];
  // Unless picked: the client's latest shoot if it was this past week (most likely the one), otherwise no shoot.
  const filmed: { shoot?: string; date?: IsoDate } =
    filmedOn?.clientId === where.client_id
      ? filmedOn
      : recent[0] && daysBetween(recent[0].date, today) <= 7
        ? { shoot: recent[0].id }
        : {};
  const otherDay = filmed.date && !recent.some((r) => r.date === filmed.date) ? filmed.date : null;

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
              format,
              on_camera: onCamera,
              location,
              profile: client?.profiles.includes(profile) ? profile : null,
              script: script.filter((s) => s.text.trim()),
              note,
              reference_url: reference,
              drive_url: drive,
              publish_date: defaults.publish_date ?? null,
              shoot_id: defaults.shoot_id ?? (asksShoot && filmed.shoot ? filmed.shoot : null),
              shoot_date: asksShoot && !filmed.shoot ? (filmed.date ?? null) : null,
              ...(stage === "shot" ? { phase: 2, shot_status: "shot" as const } : stage === "published" ? { phase: 5, shot_status: "shot" as const } : {}),
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
    });

  const label = (text: string) => <span className="text-[13px] font-medium text-ink3">{text}</span>;
  const textareaClass =
    "w-full resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink3 focus:border-accent";

  const kindSwitch = (
    <Segmented size="sm" items={(["task", "video"] as const).map((k) => ({ key: k, label: tv(k), active: kind === k, onClick: () => setKind(k) }))} />
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
      {blocked && !where.client_id && <p className="text-[13px] text-ink2 sm:col-span-2">{t("notOnTeam", { client: blocked })}</p>}
      {needsProject && <p className="text-[13px] text-rust-ink sm:col-span-2">{t("pickProject")}</p>}
      <div className="flex flex-col gap-2 sm:col-span-2">
        {label(t(kind === "video" ? "fields.editor" : "fields.assignees"))}
        <PeoplePicker
          size="lg"
          people={assignablePeople(lookups, where.client_id, assignees)}
          value={kind === "video" ? assignees.slice(0, 1) : assignees}
          onChange={(ids) => setAssignees(kind === "video" ? ids.filter((id) => !assignees.includes(id)).slice(-1) : ids)}
        />
      </div>
    </>
  );

  const videoFields = (
    <>
      <div className="flex flex-col gap-2 sm:col-span-2">
        {label(tv("stage"))}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["idea", "shot", "published"] as const).map((k) => (
            <Pill key={k} size="lg" selected={stage === k} onClick={() => setStage(k)}>
              {tv(`stages.${k}`)}
            </Pill>
          ))}
        </div>
        {asksShoot && (
          <div className="mb-3 flex flex-col gap-2">
            {label(tv("filmedOn"))}
            <div className="flex flex-wrap items-center gap-1.5">
              {loadingShoots && <span aria-hidden className="h-[38px] w-28 rounded-full border border-line2" />}
              {recent.map((r) => (
                <Pill key={r.id} size="lg" selected={filmed.shoot === r.id} onClick={() => { setFilmedOn({ clientId: where.client_id, shoot: r.id }); setFilmedPickerOpen(false); }}>
                  {tw("short", { day: String(weekdayIndex(r.date)) })} {formatShortDate(r.date)}
                  {r.location && (
                    <span title={r.location} className={`max-w-[12ch] truncate font-normal ${filmed.shoot === r.id ? "" : "text-ink3"}`}>
                      {r.location}
                    </span>
                  )}
                </Pill>
              ))}
              <button
                type="button"
                onClick={() => setFilmedPickerOpen((o) => !o)}
                aria-expanded={filmedPickerOpen}
                className={`h-[38px] cursor-pointer whitespace-nowrap rounded-full border px-3.5 text-[14px] font-semibold ${
                  otherDay ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink"
                }`}
              >
                {otherDay ? `${tw("short", { day: String(weekdayIndex(otherDay)) })} ${formatShortDate(otherDay)}` : tv("otherDay")} ▾
              </button>
              {!loadingShoots && (
                <Pill size="lg" selected={!filmed.shoot && !filmed.date} onClick={() => { setFilmedOn({ clientId: where.client_id }); setFilmedPickerOpen(false); }}>
                  {tv("notOnShoot")}
                </Pill>
              )}
            </div>
            {filmedPickerOpen && (
              <div className="w-full max-w-[300px] rounded-lg border border-line2 bg-surf p-3.5">
                <MonthGrid
                  value={filmed.date ?? null}
                  today={today}
                  max={today}
                  onPick={(d) => {
                    const match = recent.find((r) => r.date === d);
                    setFilmedOn(match ? { clientId: where.client_id, shoot: match.id } : { clientId: where.client_id, date: d });
                    setFilmedPickerOpen(false);
                  }}
                />
              </div>
            )}
            {otherDay && <span className="text-[13px] text-ink3">{tv("newShootDay", { date: formatDate(otherDay), client: client?.name ?? "" })}</span>}
          </div>
        )}
        {label(tv("formatLabel"))}
        <div className="flex flex-wrap items-center gap-1.5">
          {FORMATS.map((f) => (
            <Pill key={f} size="lg" selected={format === f} onClick={() => setFormat(f)}>
              <span className="size-2 rounded-full" style={{ background: FORMAT_COLOR[f] }} />
              {tf(f)}
            </Pill>
          ))}
        </div>
        {label(tv("contentType"))}
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((ct) => (
            <Pill key={ct} size="lg" selected={contentType === ct} onClick={() => setContentType(contentType === ct ? null : ct)}>
              <span className="size-2 rounded-full" style={{ background: typeColor(ct) }} />
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
      <p className="text-[13px] leading-snug text-ink3 sm:col-span-2">{tv("laterHint")}</p>
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
      <span className="-mt-2 text-[13px] text-ink3">{tv("scriptHint")}</span>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        <ScriptFields
          sections={script}
          onChange={(i, patch) => setScript((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
          onRemove={(i) => setScript((cur) => cur.filter((_, j) => j !== i))}
        />
      </div>
      <label className="flex flex-col gap-2">
        <span className="eyebrow">{tv("notesLabel")}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder={tv("notesPlaceholder")} className={`${textareaClass} min-h-[132px]`} />
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
          <div className="w-full max-w-[300px] rounded-lg border border-line2 bg-surf p-3.5">
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
      {/* Stays in place (its label flips) so focus isn't lost when the fields open. */}
      <button
        type="button"
        aria-expanded={more}
        // Not closable while one of them is filled in: it would still be saved, just out of sight.
        disabled={more && Boolean(type || estimate.trim() || drive.trim() || description.trim())}
        onClick={() => setMore((m) => !m)}
        className="flex min-h-11 cursor-pointer items-center justify-self-start text-[14px] font-medium text-rust-ink hover:text-ink disabled:hidden sm:col-span-2"
      >
        {more ? t("fewerDetails") : t("moreDetails")}
      </button>
      {more && (
      <>
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
      )}
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
        className={`relative flex h-full w-full flex-col overflow-hidden bg-bg lg:rounded-lg lg:border lg:border-line2 lg:shadow-[var(--shadow-overlay)] ${
          isVideo ? "lg:h-[calc(100dvh-64px)] lg:w-[min(1800px,calc(100vw-96px))]" : "lg:h-auto lg:max-h-[calc(100dvh-64px)] lg:w-[min(1040px,calc(100vw-96px))]"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-6 lg:px-10 lg:pt-9">
          <div className="flex items-center gap-4">
            <h2 className="display whitespace-nowrap text-[24px] leading-tight">{isVideo ? tv("newTitle") : t("new")}</h2>
            {kindSwitch}
          </div>
          <button type="button" aria-label={t("cancel")} onClick={onClose} className="size-[34px] cursor-pointer rounded-md text-[24px] text-ink2 hover:text-ink">
            ×
          </button>
        </div>

        {isVideo ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:overflow-hidden">
            <div className="flex flex-col gap-5 px-5 pb-6 pt-[18px] lg:overflow-auto lg:px-10 lg:pb-10 lg:pt-7">
              {titleInput}
              <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
                {shared}
                {videoFields}
              </div>
            </div>
            <div className="flex min-h-0 flex-col border-line px-5 pb-6 pt-[18px] lg:border-l lg:px-10 lg:pb-10 lg:pt-7">{scriptColumn}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 overflow-auto px-5 pb-6 pt-[18px] lg:px-10 lg:pb-10 lg:pt-7">
            {titleInput}
            <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
              {shared}
              {taskFields}
            </div>
          </div>
        )}
        {error && <p role="alert" className="mx-5 mb-3 rounded-md bg-red-bg px-3 py-2 text-[13px] text-red-ink lg:mx-7">{error}</p>}

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-line px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 lg:px-10 lg:py-5">
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
