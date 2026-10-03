"use client";

// Form controls shared by the task panel (3a/3c) and the new-task form (3b/3d).
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { ClientOption } from "@/lib/data";
import { PRIORITIES, PRIORITY_COLOR, STATUSES, STATUS_COLOR, TASK_TYPES, type Person, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/tasks";
import { Pill } from "./bits";

export const selectClass =
  "h-9 cursor-pointer appearance-none rounded-md border border-line2 bg-transparent bg-[url(/brand/chevron.svg)] bg-[length:10px] bg-[right_12px_center] bg-no-repeat pl-3 pr-8 text-[14px] font-medium text-ink outline-none focus:border-accent disabled:cursor-default";

export const inputClass =
  "h-[42px] rounded-md border border-line2 bg-transparent px-3 text-[14px] text-ink outline-none placeholder:text-ink3 focus:border-accent";

/** Label column + control, separated by hairlines (design 3a). */
export function FieldRow({ label, children, top }: { label: string; children: ReactNode; top?: boolean }) {
  return (
    <div className={`grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-t border-line py-2.5 sm:grid-cols-[120px_minmax(0,1fr)] ${top ? "items-start" : "items-center"}`}>
      <span className={`text-[13px] font-medium text-ink3 ${top ? "pt-2.5" : ""}`}>{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function StatusPicker({ value, onChange, disabled, size }: { value: TaskStatus; onChange: (s: TaskStatus) => void; disabled?: boolean; size?: "md" | "lg" }) {
  const t = useTranslations("status");
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUSES.map((s) => (
        <Pill key={s} size={size} selected={value === s} disabled={disabled} onClick={() => onChange(s)}>
          <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
          {t(s)}
        </Pill>
      ))}
    </div>
  );
}

export function PriorityPicker({ value, onChange, disabled, size }: { value: TaskPriority; onChange: (p: TaskPriority) => void; disabled?: boolean; size?: "md" | "lg" }) {
  const t = useTranslations("priority");
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRIORITIES.map((p) => (
        <Pill key={p} size={size} selected={value === p} disabled={disabled} onClick={() => onChange(p)}>
          <span className="size-2 rounded-[2px]" style={{ background: PRIORITY_COLOR[p] }} />
          {t(p)}
        </Pill>
      ))}
    </div>
  );
}

export function TypePicker({ value, onChange, disabled, size }: { value: TaskType | null; onChange: (t: TaskType | null) => void; disabled?: boolean; size?: "md" | "lg" }) {
  const t = useTranslations("taskType");
  return (
    <div className="flex flex-wrap gap-1.5">
      {TASK_TYPES.map((ty) => (
        <Pill key={ty} size={size} selected={value === ty} disabled={disabled} onClick={() => onChange(value === ty ? null : ty)}>
          {t(ty)}
        </Pill>
      ))}
    </div>
  );
}

export function PeoplePicker({
  people,
  value,
  onChange,
  disabled,
  size = "md",
}: {
  people: Person[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map((p) => {
        const selected = value.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? value.filter((v) => v !== p.id) : [...value, p.id])}
            className={`inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border pl-1 font-medium disabled:cursor-default ${
              size === "lg" ? "h-[38px] pr-3.5 text-[14px]" : "h-[34px] pr-3 text-[13px]"
            } ${selected ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`}
          >
            <Avatar person={p} size={size === "lg" ? 28 : 26} />
            {p.full_name.split(" ")[0]}
          </button>
        );
      })}
    </div>
  );
}

/** Projects a user may file under for a client (members: only their projects). */
export function allowedProjects(client: ClientOption | undefined) {
  if (!client) return [];
  return client.isTeam ? client.projects : client.projects.filter((p) => p.isMember);
}

export function ClientProjectSelects({
  clients,
  clientId,
  projectId,
  onChange,
  disabled,
  layout = "rows",
}: {
  clients: ClientOption[];
  clientId: string | null;
  projectId: string | null;
  onChange: (next: { client_id: string | null; project_id: string | null }) => void;
  disabled?: boolean;
  layout?: "rows" | "grid";
}) {
  const t = useTranslations("task");
  // A member who isn't on any project of a client can't file tasks there.
  const selectable = clients.filter((c) => c.isTeam || c.projects.some((p) => p.isMember) || c.id === clientId);
  const client = clients.find((c) => c.id === clientId);
  const projects = allowedProjects(client);
  const currentProjectHidden = projectId && !projects.some((p) => p.id === projectId);

  const pickClient = (id: string) => {
    const next = clients.find((c) => c.id === id);
    const options = allowedProjects(next);
    onChange({ client_id: id || null, project_id: next && !next.isTeam ? (options[0]?.id ?? null) : null });
  };

  const clientSelect = (
    <select value={clientId ?? ""} disabled={disabled} onChange={(e) => pickClient(e.target.value)} className={`${selectClass} ${layout === "grid" ? "h-[42px] w-full" : ""}`}>
      <option value="">{t("noClient")}</option>
      {selectable.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );

  const projectSelect = (
    <select
      value={projectId ?? ""}
      disabled={disabled || !client}
      onChange={(e) => onChange({ client_id: clientId, project_id: e.target.value || null })}
      className={`${selectClass} ${layout === "grid" ? "h-[42px] w-full" : ""}`}
    >
      {(client?.isTeam || !client) && <option value="">{t("noProject")}</option>}
      {currentProjectHidden && <option value={projectId}>…</option>}
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  if (layout === "grid") {
    return (
      <>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink3">{t("fields.client")}</span>
          {clientSelect}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink3">{t("fields.project")}</span>
          {projectSelect}
        </label>
      </>
    );
  }
  return (
    <>
      <FieldRow label={t("fields.client")}>{clientSelect}</FieldRow>
      <FieldRow label={t("fields.project")}>{projectSelect}</FieldRow>
    </>
  );
}
