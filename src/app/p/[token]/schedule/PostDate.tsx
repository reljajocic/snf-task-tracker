"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { DrawnCheck } from "@/components/ui/DrawnCheck";
import { useApprover } from "../useApprover";
import { NameField } from "../video/[taskId]/VideoDecision";
import { setPostDate } from "../actions";
import { Button, buttonClass } from "@/components/ui/Button";

/**
 * The client gives a filmed video its posting date, or moves one. The phone's own date picker; their name once
 * (remembered on the device) so the team knows who moved it.
 */
export function PostDate({ token, taskId, date, min, compact }: { token: string; taskId: string; date: string | null; min: string; compact?: boolean }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const [name, setName] = useApprover();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(date ?? "");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await setPostDate(token, taskId, value, name);
      if (!res.ok) return setError(res.error);
      setError(null);
      setOpen(false);
      setDone(true);
      router.refresh();
    });

  if (!open)
    return (
      <span className="flex items-center gap-3">
        {done && (
          <span className="snf-saved inline-flex items-center gap-1 text-[13px] font-medium text-[var(--status-done)]">
            <DrawnCheck size={14} />
            {t("dateSaved")}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setValue(date ?? "");
            setOpen(true);
          }}
          className={buttonClass({ variant: date || compact ? "secondary" : "primary", size: "sm", className: compact ? "max-lg:h-11" : "self-start max-lg:h-12" })}
        >
          {date ? t("changeDate") : t("pickDate")}
        </button>
      </span>
    );

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-line2 p-4">
      {!name.trim() && <NameField name={name} setName={setName} />}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink3">{t("postDate")}</span>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 rounded-md border border-line2 bg-transparent px-3.5 text-[16px] text-ink outline-none [color-scheme:light_dark] focus:border-accent"
        />
      </label>
      <span className="text-[12px] leading-snug text-ink3">{t("postDateHint")}</span>
      <div className="flex flex-wrap gap-3">
        <Button size="sm" className="max-lg:h-11" disabled={pending || !value || value === date || !name.trim()} onClick={save}>
          {t("saveDate")}
        </Button>
        <Button variant="ghost" size="sm" className="max-lg:h-11" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
      {error && <span role="alert" className="text-[14px] text-red-ink">{error}</span>}
    </div>
  );
}
