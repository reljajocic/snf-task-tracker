"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { Decision } from "@/lib/portal";
import { decideVideo, undoDecision } from "../../actions";
import { useApprover } from "../../useApprover";

export function NameField({ name, setName }: { name: string; setName: (v: string) => void }) {
  const t = useTranslations("portal");
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink3">{t("yourName")}</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        className="h-12 rounded-md border border-line2 bg-transparent px-3.5 text-[16px] text-ink outline-none focus:border-accent"
      />
      <span className="text-[12px] text-ink3">{t("yourNameHint")}</span>
    </label>
  );
}

export function VideoDecision({ token, taskId, versionId, decision, undoable }: { token: string; taskId: string; versionId: string | null; decision: Decision | null; undoable: boolean }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const [name, setName] = useApprover();
  const [form, setForm] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decide = (d: "approved" | "changes") =>
    startTransition(async () => {
      const res = await decideVideo(token, taskId, versionId, d, name, comment);
      if (!res.ok) return setError(res.error);
      setError(null);
      setForm(false);
      setLastId(res.approvalId ?? null);
      router.refresh();
    });

  if (decision) {
    const approved = decision.status === "approved";
    return (
      <div className={`flex flex-col gap-2 rounded-lg border px-5 py-4 ${approved ? "border-[var(--status-done)]" : "border-[var(--status-waiting)]"}`}>
        <span className={`text-[15px] font-semibold ${approved ? "text-[var(--status-done)]" : "text-[var(--status-waiting)]"}`}>
          {approved ? t("approvedBy", { name: decision.approver_name }) : t("changesBy", { name: decision.approver_name })}
        </span>
        {decision.comment && <span className="whitespace-pre-wrap text-[14px] text-ink2">“{decision.comment}”</span>}
        {!approved && <span className="text-[14px] text-ink2">{t("sentToTeam")}</span>}
        {(lastId === decision.id || undoable) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => { await undoDecision(token, decision.id); router.refresh(); })}
            className="cursor-pointer self-start text-[13px] font-medium text-ink3 hover:text-ink"
          >
            {t("undo")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <NameField name={name} setName={setName} />
      {form ? (
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={t("changesPlaceholder")}
            className="resize-y rounded-md border border-accent bg-transparent px-4 py-3.5 text-[15px] leading-normal text-ink outline-none"
          />
          <div className="flex gap-3">
            <button type="button" disabled={pending || !comment.trim() || !name.trim()} onClick={() => decide("changes")} className="h-12 cursor-pointer rounded-md bg-accent px-[22px] text-[15px] font-semibold text-charcoal disabled:opacity-45">
              {t("send")}
            </button>
            <button type="button" onClick={() => setForm(false)} className="h-12 cursor-pointer px-3 text-[15px] text-ink2">
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button type="button" disabled={pending || !name.trim()} onClick={() => decide("approved")} className="h-14 flex-1 cursor-pointer rounded-md bg-accent text-[15px] font-semibold uppercase tracking-[0.12em] text-charcoal disabled:opacity-45">
            {t("approve")}
          </button>
          <button type="button" onClick={() => setForm(true)} className="h-14 flex-1 cursor-pointer rounded-md border border-line2 text-[15px] font-medium text-ink">
            {t("askChanges")}
          </button>
        </div>
      )}
      {error && <span role="alert" className="text-[14px] text-red-ink">{error}</span>}
    </div>
  );
}
