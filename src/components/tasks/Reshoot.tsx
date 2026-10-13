"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { returnVideoToIdeas } from "@/app/(app)/task-actions";
import { formatDate } from "@/lib/dates";
import type { ShootAttempt } from "@/lib/tasks";

/** "Return to ideas": asks why (required), then sends the video back for a reshoot. */
export function ReturnToIdeas({ taskId, onDone, className = "" }: { taskId: string; onDone: () => void; className?: string }) {
  const t = useTranslations("reshoot");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`cursor-pointer text-[13px] font-medium text-rust-ink underline-offset-2 hover:underline ${className}`}>
        ↺ {t("action")}
      </button>
    );
  }
  const submit = () =>
    start(async () => {
      const res = await returnVideoToIdeas(taskId, reason);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      setReason("");
      setError(null);
      onDone();
    });
  return (
    <div className={`flex w-full flex-col gap-2.5 rounded-md border border-line2 bg-chip p-3.5 ${className}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">{t("reasonLabel")}</span>
        <input
          autoFocus
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reason.trim() && submit()}
          placeholder={t("reasonPh")}
          className="h-10 rounded-md border border-line2 bg-transparent px-3 text-[16px] text-ink outline-none focus:border-accent sm:text-[14px]"
        />
      </label>
      <span className="text-[13px] leading-snug text-ink3">{t("hint")}</span>
      {error && <span role="alert" className="text-[13px] text-red-ink">{error}</span>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !reason.trim()}
          onClick={submit}
          className="h-9 cursor-pointer rounded-md bg-accent px-3.5 text-[13px] font-semibold text-charcoal disabled:opacity-45"
        >
          {t("confirm")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 cursor-pointer rounded-md border border-line2 px-3.5 text-[13px] font-medium text-ink2">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

/** "To reshoot · reason" on an idea that was filmed before. */
export function ReshootBadge({ attempt }: { attempt: ShootAttempt }) {
  const t = useTranslations("reshoot");
  return (
    <span className="flex min-w-0 items-center gap-1.5 self-start rounded-full bg-rust-bg px-2.5 py-1 text-[12px] font-medium text-rust-ink">
      <span className="flex-none font-semibold">↺ {t("badge")}</span>
      <span className="truncate">· {attempt.reason}</span>
    </span>
  );
}

/** Every earlier attempt, newest first. */
export function ShootHistory({ attempts }: { attempts: ShootAttempt[] }) {
  const t = useTranslations("reshoot");
  const ts = useTranslations("postingStatus");
  if (!attempts.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">{t("history")}</span>
      {attempts.map((a, i) => (
        <div key={a.returned_at} className="flex flex-col gap-1 border-l-2 border-accent/60 pl-3">
          <span className="text-[14px] font-semibold">
            {t("attempt", { n: attempts.length - i })} · {a.shoot_date ? formatDate(a.shoot_date) : t("noDate")}
            {a.location ? ` · ${a.location}` : ""}
          </span>
          <span className="text-[13px] text-ink2">
            {[a.on_camera, a.shoot_time, a.shot_status && ts.has(a.shot_status) ? ts(a.shot_status) : null].filter(Boolean).join(" · ")}
          </span>
          <span className="text-[14px] text-ink">“{a.reason}”</span>
          <span className="text-[12px] text-ink3">
            {a.publish_date ? `${t("wasPosting", { date: formatDate(a.publish_date) })} · ` : ""}
            {t("returned", { name: a.returned_by?.full_name ?? "—", date: formatDate(a.returned_at.slice(0, 10)) })}
          </span>
        </div>
      ))}
    </div>
  );
}
