"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { PeoplePicker, inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { CLIENT_STATUSES, PROJECT_STATUSES } from "@/lib/client-status";
import type { Client, Project } from "@/lib/clients";
import type { Person } from "@/lib/tasks";
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

export function ClientForm({ client, canDelete }: { client?: Client; canDelete?: boolean }) {
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
                onClick={() => window.confirm(t("clientForm.deleteConfirm")) && startDelete(async () => void (await deleteClient(client.id)))}
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
        <Field label={t("clientForm.instagram")}>
          <input name="instagram" placeholder="@" defaultValue={client?.instagram ?? ""} className={inputClass} />
        </Field>
        <Field label={t("clientForm.drive")}>
          <input name="drive_url" placeholder="drive.google.com/…" defaultValue={client?.drive_url ?? ""} className={inputClass} />
        </Field>
        <Field label={t("clientForm.locations")} hint={t("clientForm.locationsHint")} wide>
          <input name="locations" defaultValue={client?.locations.join(", ")} className={inputClass} />
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
