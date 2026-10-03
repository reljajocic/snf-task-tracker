"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { PeoplePicker, inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { CLIENT_STATUSES, PROJECT_STATUSES } from "@/lib/client-status";
import type { Client, Project } from "@/lib/clients";
import type { EditorRule } from "@/lib/editor-rules";
import type { Person } from "@/lib/tasks";
import { SOCIAL_LABEL, SOCIAL_PLATFORMS, type Social, type SocialPlatform } from "@/lib/socials";
import { deleteClient, deleteProject, saveClient, saveProject, type FormState } from "./actions";

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[13px] font-medium text-ink3">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink3">{hint}</span>}
    </label>
  );
}

function FormShell({
  title,
  backHref,
  children,
  footer,
}: {
  title: string;
  backHref: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex max-w-[760px] flex-col gap-6 px-5 pb-[120px] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <Link href={backHref} className="text-[14px] font-medium text-ink3 hover:text-ink">‹</Link>
      <h1 className="display text-[30px] lg:text-[40px]">{title}</h1>
      <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">{children}</div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">{footer}</div>
    </div>
  );
}

export function ClientForm({ client, canDelete, people }: { client?: Client; canDelete?: boolean; people: Person[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<FormState, FormData>(saveClient, null);
  const [deleting, startDelete] = useTransition();
  const back = client ? `/clients/${client.id}` : "/clients";

  return (
    <form action={action}>
      {client && <input type="hidden" name="id" value={client.id} />}
      <FormShell
        title={client ? t("clientForm.editTitle") : t("clientForm.newTitle")}
        backHref={back}
        footer={
          <>
            {state?.error && <p role="alert" className="mr-auto text-[13px] text-red-ink">{state.error}</p>}
            {client && canDelete && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  // Typing the name guards against deleting a client with its whole history by accident.
                  const typed = window.prompt(t("clientForm.deleteConfirm", { name: client.name }));
                  if (typed?.trim() !== client.name.trim()) return;
                  startDelete(async () => void (await deleteClient(client.id)));
                }}
                className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
              >
                {t("clientForm.delete")}
              </button>
            )}
            <Link href={back} className="flex h-10 items-center px-4 text-[14px] font-medium text-ink2">{t("clientForm.cancel")}</Link>
            <Button type="submit" size="sm" disabled={pending}>{client ? t("clientForm.save") : t("clientForm.create")}</Button>
          </>
        }
      >
        <Field label={t("clientForm.name")} wide>
          <input name="name" required defaultValue={client?.name} autoFocus={!client} className={inputClass} />
        </Field>
        <Field label={t("clientForm.status")}>
          <select name="status" defaultValue={client?.status ?? "active"} className={`${selectClass} h-[42px]`}>
            {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{t(`clientStatus.${s}`)}</option>)}
          </select>
        </Field>
        <Field label={t("clientForm.since")}>
          <input name="since" type="month" defaultValue={client?.since?.slice(0, 7) ?? ""} className={inputClass} />
        </Field>
        <Field label={t("clientForm.services")} hint={t("clientForm.servicesHint")} wide>
          <input name="services" defaultValue={client?.services.join(", ")} className={inputClass} />
        </Field>
        <Field label={t("clientForm.city")}>
          <input name="city" defaultValue={client?.city ?? ""} className={inputClass} />
        </Field>
        <Field label={t("clientForm.email")}>
          <input name="email" type="email" defaultValue={client?.email ?? ""} className={inputClass} />
        </Field>
        <SocialsField initial={client?.socials ?? []} />
        <Field label={t("clientForm.drive")} wide>
          <input name="drive_url" placeholder="drive.google.com/…" defaultValue={client?.drive_url ?? ""} className={inputClass} />
        </Field>
        <Field label={t("clientForm.locations")} hint={t("clientForm.locationsHint")} wide>
          <input name="locations" defaultValue={client?.locations.join(", ")} className={inputClass} />
        </Field>
        <Field label={t("clientForm.profiles")} hint={t("clientForm.profilesHint")} wide>
          <input name="profiles" placeholder="Kymco Srbija, QJ Srbija" defaultValue={(client?.profiles ?? []).join(", ")} className={inputClass} />
        </Field>
        <Field label={t("clientForm.contentTypes")} hint={t("clientForm.contentTypesHint")} wide>
          <input name="content_types" defaultValue={(client?.content_types ?? []).join(", ")} className={inputClass} />
        </Field>
        <PostingDays initial={client?.posting_days ?? [0, 2, 4]} label={t("clientForm.postingDays")} />
        <EditorRules initial={client?.editor_rules ?? []} people={people} />
        <Field label={t("clientForm.defaultEditor")} hint={t("clientForm.defaultEditorHint")} wide>
          <select name="default_editor_id" defaultValue={client?.default_editor_id ?? ""} className={`${selectClass} h-[42px]`}>
            <option value="">{t("clientForm.noEditor")}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Field>
        <Field label={t("clientForm.notes")} wide>
          <textarea name="notes" rows={3} defaultValue={client?.notes ?? ""} className="resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent" />
        </Field>
      </FormShell>
    </form>
  );
}

export function ProjectForm({ clientId, project, people }: { clientId: string; project?: Project; people: Person[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<FormState, FormData>(saveProject, null);
  const [members, setMembers] = useState<string[]>(project?.members ?? []);
  const [deleting, startDelete] = useTransition();
  const back = `/clients/${clientId}`;

  return (
    <form action={action}>
      <input type="hidden" name="client_id" value={clientId} />
      {project && <input type="hidden" name="id" value={project.id} />}
      {members.map((m) => <input key={m} type="hidden" name="members" value={m} />)}
      <FormShell
        title={project ? t("projectForm.editTitle") : t("projectForm.newTitle")}
        backHref={back}
        footer={
          <>
            {state?.error && <p role="alert" className="mr-auto text-[13px] text-red-ink">{state.error}</p>}
            {project && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => window.confirm(t("projectForm.deleteConfirm")) && startDelete(async () => void (await deleteProject(project.id, clientId)))}
                className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
              >
                {t("projectForm.delete")}
              </button>
            )}
            <Link href={back} className="flex h-10 items-center px-4 text-[14px] font-medium text-ink2">{t("projectForm.cancel")}</Link>
            <Button type="submit" size="sm" disabled={pending}>{t("projectForm.save")}</Button>
          </>
        }
      >
        <Field label={t("projectForm.name")} wide>
          <input name="name" required defaultValue={project?.name} autoFocus={!project} className={inputClass} />
        </Field>
        <Field label={t("projectForm.status")}>
          <select name="status" defaultValue={project?.status ?? "active"} className={`${selectClass} h-[42px]`}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{t(`projectStatus.${s}`)}</option>)}
          </select>
        </Field>
        <Field label={t("projectForm.drive")}>
          <input name="drive_url" placeholder="drive.google.com/…" defaultValue={project?.drive_url ?? ""} className={inputClass} />
        </Field>
        <Field label={t("projectForm.starts")}>
          <input name="starts_on" type="date" defaultValue={project?.starts_on ?? ""} className={inputClass} />
        </Field>
        <Field label={t("projectForm.ends")}>
          <input name="ends_on" type="date" defaultValue={project?.ends_on ?? ""} className={inputClass} />
        </Field>
        <Field label={t("projectForm.description")} wide>
          <textarea name="description" rows={3} defaultValue={project?.description ?? ""} className="resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent" />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[13px] font-medium text-ink3">{t("projectForm.members")}</span>
          <PeoplePicker size="lg" people={people} value={members} onChange={setMembers} />
          <span className="text-[12px] text-ink3">{t("projectForm.membersHint")}</span>
        </div>
      </FormShell>
    </form>
  );
}

function PostingDays({ initial, label }: { initial: number[]; label: string }) {
  const t = useTranslations("weekday");
  const [days, setDays] = useState<number[]>(initial);
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="text-[13px] font-medium text-ink3">{label}</span>
      {days.map((d) => <input key={d} type="hidden" name="posting_days" value={d} />)}
      <div className="flex flex-wrap gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const on = days.includes(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d].sort())}
              className={`h-[34px] cursor-pointer rounded-full border px-3 text-[13px] font-medium ${on ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"}`}
            >
              {t("short", { day: String(d) })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Vučko edits Wed/Fri and INFO/FUN": one row per editor, days as pills, types as text. */
function EditorRules({ initial, people }: { initial: EditorRule[]; people: Person[] }) {
  const t = useTranslations("clientForm");
  const tw = useTranslations("weekday");
  const [rows, setRows] = useState<(EditorRule & { typesText: string })[]>(initial.map((r) => ({ ...r, typesText: r.types.join(", ") })));
  const update = (i: number, patch: Partial<EditorRule & { typesText: string }>) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const value = rows
    .filter((r) => r.editor_id)
    .map(({ editor_id, days, typesText }) => ({ editor_id, days, types: typesText.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) }));
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="text-[13px] font-medium text-ink3">{t("editorRules")}</span>
      <input type="hidden" name="editor_rules" value={JSON.stringify(value)} />
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-line p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={r.editor_id}
            onChange={(e) => update(i, { editor_id: e.target.value })}
            aria-label={t("defaultEditor")}
            className={`${selectClass} h-[38px] sm:w-[190px]`}
          >
            <option value="">{t("noEditor")}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const on = r.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update(i, { days: on ? r.days.filter((x) => x !== d) : [...r.days, d].sort() })}
                  className={`h-[30px] cursor-pointer rounded-full border px-2.5 text-[12.5px] font-medium ${on ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"}`}
                >
                  {tw("short", { day: String(d) })}
                </button>
              );
            })}
          </div>
          <input
            value={r.typesText}
            onChange={(e) => update(i, { typesText: e.target.value })}
            placeholder={t("editorRuleTypes")}
            className={`${inputClass} h-[38px] min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))}
            aria-label={t("editorRuleRemove")}
            className="h-[38px] cursor-pointer px-2 text-[18px] text-ink3 hover:text-ink"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((cur) => [...cur, { editor_id: "", days: [], types: [], typesText: "" }])}
        className="cursor-pointer self-start text-[13px] font-medium text-ink2 hover:text-ink"
      >
        {t("editorRuleAdd")}
      </button>
      <span className="text-[12px] text-ink3">{t("editorRulesHint")}</span>
    </div>
  );
}

function SocialsField({ initial }: { initial: Social[] }) {
  const t = useTranslations("clientForm");
  const [rows, setRows] = useState<Social[]>(initial.length ? initial : [{ platform: "instagram", handle: "" }]);
  const update = (i: number, patch: Partial<Social>) => setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="text-[13px] font-medium text-ink3">{t("socials")}</span>
      <input type="hidden" name="socials" value={JSON.stringify(rows.filter((r) => r.handle.trim()))} />
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <select
            value={r.platform}
            onChange={(e) => update(i, { platform: e.target.value as SocialPlatform })}
            aria-label={t("socialNetwork")}
            className={`${selectClass} h-[42px] w-[140px] flex-none`}
          >
            {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{SOCIAL_LABEL[p]}</option>)}
          </select>
          <input
            value={r.handle}
            onChange={(e) => update(i, { handle: e.target.value })}
            placeholder={t("socialHandle")}
            aria-label={t("socialHandle")}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            type="button"
            aria-label={t("socialRemove")}
            onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((_, j) => j !== i) : [{ platform: "instagram", handle: "" }]))}
            className="h-[42px] w-10 flex-none cursor-pointer rounded-md text-[18px] text-ink3 hover:text-red-ink"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setRows((cur) => [...cur, { platform: "tiktok", handle: "" }])} className="cursor-pointer self-start text-[13px] font-medium text-rust-ink">
        {t("socialAdd")}
      </button>
    </div>
  );
}
