"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { CallTime } from "@/lib/content";
import { saveCallTimes } from "../actions";

/** Call sheet for the day: who comes at what time (editable by managers). */
export function CallTimes({ shootId, initial, canManage }: { shootId: string; initial: CallTime[]; canManage: boolean }) {
  const t = useTranslations("shoots");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<CallTime[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const field = "h-9 rounded-md border border-line2 bg-transparent px-2.5 text-[14px] text-ink outline-none focus:border-accent";

  if (!editing && !initial.length && !canManage) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surf p-4">
      <div className="flex items-baseline gap-2">
        <span className="display text-[15px] leading-none">{t("callTimes")}</span>
        <span className="text-[12.5px] text-ink3">{t("callTimesHint")}</span>
        {canManage && !editing && (
          <button type="button" onClick={() => { setRows(initial.length ? initial : [{ time: "", name: "", note: "" }]); setEditing(true); }} className="ml-auto cursor-pointer text-[13px] font-medium text-rust-ink">
            {t("editCallTimes")}
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await saveCallTimes(shootId, rows);
              if (res.error) return setError(res.error);
              setEditing(false);
              setError(null);
              router.refresh();
            });
          }}
        >
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[92px_minmax(0,1fr)_32px] gap-2 sm:grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)_32px]">
              <input type="time" value={r.time} onChange={(e) => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} className={field} />
              <input value={r.name} placeholder={t("callName")} onChange={(e) => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={field} />
              <input value={r.note} placeholder={t("callNote")} onChange={(e) => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} className={`${field} hidden sm:block`} />
              <button type="button" aria-label="×" onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))} className="h-9 cursor-pointer text-[16px] text-ink3 hover:text-red-ink">×</button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setRows((cur) => [...cur, { time: cur.at(-1)?.time ?? "", name: "", note: "" }])} className="cursor-pointer text-[13px] font-medium text-rust-ink">
              {t("addCall")}
            </button>
            <span className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="h-9 cursor-pointer px-2 text-[13px] text-ink3">×</button>
              <Button type="submit" size="sm" disabled={pending} className="h-9">{t("saveCall")}</Button>
            </span>
          </div>
          {error && <span className="text-[13px] text-red-ink">{error}</span>}
        </form>
      ) : initial.length ? (
        <div className="flex flex-col">
          {initial.map((r, i) => (
            <div key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-t border-line py-2 first:border-t-0">
              <span className="display text-[15px] leading-6">{r.time}</span>
              <span className="text-[15px] leading-6">
                {r.name}
                {r.note && <span className="text-[13px] text-ink3"> · {r.note}</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-[13px] text-ink3">{t("noCallTimes")}</span>
      )}
    </div>
  );
}
