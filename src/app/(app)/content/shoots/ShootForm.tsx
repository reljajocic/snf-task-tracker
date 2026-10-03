"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { PeoplePicker, inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import type { ClientOption } from "@/lib/data";
import type { Person } from "@/lib/tasks";
import { deleteShoot, saveShoot, type ShootFormState } from "./actions";

export type ShootInitial = {
  id: string;
  client_id: string;
  date: string;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  drive_url: string | null;
  crew: string[];
};

export function ShootForm({ clients, people, shoot, defaultDate }: { clients: ClientOption[]; people: Person[]; shoot?: ShootInitial; defaultDate: string }) {
  const t = useTranslations("shoots.form");
  const [state, action, pending] = useActionState<ShootFormState, FormData>(saveShoot, null);
  const [clientId, setClientId] = useState(shoot?.client_id ?? clients[0]?.id ?? "");
  const [crew, setCrew] = useState<string[]>(shoot?.crew ?? []);
  const [deleting, startDelete] = useTransition();
  const client = clients.find((c) => c.id === clientId);
  const back = shoot ? `/content/shoots/${shoot.id}` : "/content/shoots";
  const label = (s: string) => <span className="text-[13px] font-medium text-ink3">{s}</span>;

  return (
    <form action={action} className="flex max-w-[760px] flex-col gap-6 px-5 pb-[120px] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      {shoot && <input type="hidden" name="id" value={shoot.id} />}
      {crew.map((c) => <input key={c} type="hidden" name="crew" value={c} />)}
      <Link href={back} className="text-[14px] font-medium text-ink3 hover:text-ink">‹</Link>
      <h1 className="display text-[30px] lg:text-[40px]">{shoot ? t("editTitle") : t("newTitle")}</h1>
      <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          {label(t("client"))}
          <select name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${selectClass} h-[42px]`}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          {label(t("date"))}
          <input name="date" type="date" required defaultValue={shoot?.date ?? defaultDate} className={inputClass} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          {label(t("location"))}
          <input name="location" list="shoot-locations" defaultValue={shoot?.location ?? ""} className={inputClass} />
          <datalist id="shoot-locations">{client?.locations.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <label className="flex flex-col gap-2">
          {label(t("from"))}
          <input name="starts_at" type="time" defaultValue={shoot?.starts_at ?? ""} className={inputClass} />
        </label>
        <label className="flex flex-col gap-2">
          {label(t("to"))}
          <input name="ends_at" type="time" defaultValue={shoot?.ends_at ?? ""} className={inputClass} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          {label(t("drive"))}
          <input name="drive_url" placeholder="drive.google.com/…" defaultValue={shoot?.drive_url ?? ""} className={inputClass} />
        </label>
        <div className="flex flex-col gap-2 sm:col-span-2">
          {label(t("crew"))}
          <PeoplePicker size="lg" people={client ? people.filter((p) => client.team.includes(p.id) || crew.includes(p.id)) : people} value={crew} onChange={setCrew} />
        </div>
        <label className="flex flex-col gap-2 sm:col-span-2">
          {label(t("notes"))}
          <textarea name="notes" rows={3} defaultValue={shoot?.notes ?? ""} className="resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        {state?.error && <p role="alert" className="mr-auto text-[13px] text-red-ink">{state.error}</p>}
        {shoot && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => window.confirm(t("deleteConfirm")) && startDelete(async () => void (await deleteShoot(shoot.id)))}
            className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
          >
            {t("delete")}
          </button>
        )}
        <Link href={back} className="flex h-10 items-center px-4 text-[14px] font-medium text-ink2">{t("cancel")}</Link>
        <Button type="submit" size="sm" disabled={pending}>{t("save")}</Button>
      </div>
    </form>
  );
}
