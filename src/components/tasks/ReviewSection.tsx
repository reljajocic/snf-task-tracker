"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { addVersion, loadReview, type ReviewState } from "@/app/(app)/task-actions";
import { formatDate } from "@/lib/dates";
import type { Task } from "@/lib/tasks";

const DECISION = { approved: "text-[var(--status-done)]", changes: "text-[var(--status-waiting)]" };

/** Versions sent to the client and their decisions; script approval status (inside the video panel). */
export function ReviewSection({ task, disabled, onChanged }: { task: Task; disabled: boolean; onChanged: () => void }) {
  const t = useTranslations();
  const [review, setReview] = useState<ReviewState | null>(null);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    loadReview(task.id).then((r) => live && setReview(r));
    return () => {
      live = false;
    };
  }, [task.id, task.phase]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <span className="eyebrow">{t("versions.title")}</span>
        {!disabled && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="ml-auto cursor-pointer text-[13px] font-medium text-rust-ink">
            {t("versions.add")}
          </button>
        )}
      </div>

      {review?.script && (
        <span className={`text-[13px] font-medium ${DECISION[review.script.status]}`}>
          {t(review.script.status === "approved" ? "scriptApproval.approved" : "scriptApproval.changes", { name: review.script.approver_name })}
          {review.script.comment ? ` — “${review.script.comment}”` : ""}
        </span>
      )}

      {review && review.versions.length > 0 ? (
        <div className="flex flex-col overflow-hidden rounded-lg border border-line">
          {review.versions.map((v) => (
            <div key={v.id} className="flex flex-col gap-1 border-b border-line px-3.5 py-2.5 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <a href={v.url} target="_blank" rel="noreferrer" className="text-[14px] font-medium hover:underline">
                  {t("versions.version", { n: v.version })} ↗
                </a>
                <span className="text-[12px] text-ink3">{formatDate(v.created_at.slice(0, 10))}</span>
              </div>
              {v.note && <span className="text-[13px] text-ink2">{v.note}</span>}
              <span className={`text-[13px] font-medium ${v.decision ? DECISION[v.decision.status] : "text-rust-ink"}`}>
                {v.decision
                  ? t(v.decision.status === "approved" ? "versions.approved" : "versions.changes", { name: v.decision.approver_name })
                  : t("versions.pending")}
                {v.decision?.comment ? ` — “${v.decision.comment}”` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        !adding && <span className="text-[13px] text-ink3">{t("versions.none")}</span>
      )}

      {adding && (
        <form
          className="flex flex-col gap-2 rounded-lg border border-line2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await addVersion(task.id, { url, note, notifyClient: notify });
              if (!res.ok) return setError(res.error);
              setUrl("");
              setNote("");
              setNotify(false);
              setAdding(false);
              setError(null);
              setReview(await loadReview(task.id));
              onChanged();
            });
          }}
        >
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("versions.url")} className="h-9 rounded-md border border-line2 bg-transparent px-3 text-[14px] text-ink outline-none focus:border-accent" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("versions.note")} className="resize-y rounded-md border border-line2 bg-transparent px-3 py-2 text-[14px] text-ink outline-none focus:border-accent" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[var(--accent)]" />
              {t("versions.notify")}
            </label>
            <span className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className="h-9 cursor-pointer px-2 text-[13px] text-ink3">×</button>
              <button type="submit" disabled={pending || !url.trim()} className="h-9 cursor-pointer rounded-md bg-accent px-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-charcoal disabled:opacity-45">
                {t("versions.save")}
              </button>
            </span>
          </div>
          {error && <span className="text-[13px] text-red-ink">{error}</span>}
        </form>
      )}
    </div>
  );
}
