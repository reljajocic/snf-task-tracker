"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PRIORITIES, STATUSES, TASK_TYPES, type Person } from "@/lib/tasks";

export const LIST_FILTER_KEYS = ["who", "client", "status", "priority", "type"] as const;

const pillSelect =
  "h-[38px] cursor-pointer appearance-none rounded-full border bg-transparent px-3.5 text-[13px] font-medium outline-none";

/** 5a filter bar (desktop) and 5b people chips + "Filters · N" sheet (mobile). State lives in the URL. */
export function ListFilters({ people, clients }: { people: Person[]; clients: { id: string; name: string }[] }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sheet, setSheet] = useState(false);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const value = (k: string) => params.get(k) ?? "all";
  const active = LIST_FILTER_KEYS.filter((k) => params.get(k)).length;
  const showDone = params.get("done") === "1";
  const tone = (k: string) => (params.get(k) ? "border-ink2 text-ink" : "border-line2 text-ink2");

  const selects = (
    <>
      <select aria-label={t("list.allPeople")} value={value("who")} onChange={(e) => set({ who: e.target.value })} className={`${pillSelect} ${tone("who")}`}>
        <option value="all">{t("list.allPeople")}</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.full_name}</option>
        ))}
      </select>
      <select aria-label={t("list.allClients")} value={value("client")} onChange={(e) => set({ client: e.target.value })} className={`${pillSelect} ${tone("client")}`}>
        <option value="all">{t("list.allClients")}</option>
        <option value="none">{t("task.noClient")}</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select aria-label={t("list.allStatuses")} value={value("status")} onChange={(e) => set({ status: e.target.value })} className={`${pillSelect} ${tone("status")}`}>
        <option value="all">{t("list.allStatuses")}</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{t(`status.${s}`)}</option>
        ))}
      </select>
      <select aria-label={t("list.allPriorities")} value={value("priority")} onChange={(e) => set({ priority: e.target.value })} className={`${pillSelect} ${tone("priority")}`}>
        <option value="all">{t("list.allPriorities")}</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{t(`priority.${p}`)}</option>
        ))}
      </select>
      <select aria-label={t("list.allTypes")} value={value("type")} onChange={(e) => set({ type: e.target.value })} className={`${pillSelect} ${tone("type")}`}>
        <option value="all">{t("list.allTypes")}</option>
        {TASK_TYPES.map((ty) => (
          <option key={ty} value={ty}>{t(`taskType.${ty}`)}</option>
        ))}
      </select>
      {active > 0 && (
        <button type="button" onClick={() => set(Object.fromEntries(LIST_FILTER_KEYS.map((k) => [k, null])))} className="h-[38px] cursor-pointer whitespace-nowrap px-3 text-[13px] font-medium text-rust-ink">
          {t("list.reset")}
        </button>
      )}
    </>
  );

  const doneToggle = (
    <button type="button" role="switch" aria-checked={showDone} onClick={() => set({ done: showDone ? null : "1" })} className="flex h-[38px] cursor-pointer items-center gap-2.5 whitespace-nowrap px-1 text-[13px] font-medium text-ink2">
      <span className={`relative h-5 w-9 rounded-full transition-colors ${showDone ? "bg-accent" : "bg-line2"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-offwhite transition-[left] ${showDone ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {t("list.showDone")}
    </button>
  );

  return (
    <>
      <div className="hidden flex-wrap items-center gap-2 border-b border-line px-10 pb-[18px] lg:flex">
        {selects}
        <span className="ml-auto">{doneToggle}</span>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-3 lg:hidden">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[{ id: "all", full_name: t("list.everyone") }, ...people].map((p) => {
            const selected = value("who") === p.id;
            return (
              <button key={p.id} type="button" onClick={() => set({ who: p.id })} className={`h-10 flex-none cursor-pointer whitespace-nowrap rounded-full border px-4 text-[14px] font-medium ${selected ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"}`}>
                {p.full_name.split(" ")[0]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setSheet((s) => !s)} className={`h-10 cursor-pointer rounded-full border px-4 text-[14px] font-medium ${active ? "border-ink2 text-ink" : "border-line2 text-ink2"}`}>
            {active ? t("list.filtersN", { count: active }) : t("list.filters")}
          </button>
          {doneToggle}
        </div>
        {sheet && <div className="flex flex-wrap gap-2 rounded-[10px] border border-line bg-surf p-3">{selects}</div>}
      </div>
    </>
  );
}
