"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { Decision } from "@/lib/portal";
import { decideVideo, requestChange, undoDecision } from "../../actions";
import { useApprover } from "../../useApprover";
import { DrawnCheck } from "@/components/ui/DrawnCheck";
import { Button } from "@/components/ui/Button";

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
      // The answer to a decision just made comes in with a drawn tick, so the client knows it went through.
      <div className={`flex flex-col gap-2 rounded-lg border px-5 py-4 ${approved ? "border-[var(--status-done)]" : "border-[var(--status-waiting)]"} ${lastId === decision.id ? "snf-in" : ""}`}>
        <span className={`flex items-center gap-2 text-[15px] font-semibold ${approved ? "text-[var(--status-done)]" : "text-[var(--waiting-ink)]"}`}>
          {lastId === decision.id && <DrawnCheck size={18} />}
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
          <div className="flex flex-wrap gap-3">
            <Button size="md" disabled={pending || !comment.trim() || !name.trim()} onClick={() => decide("changes")}>
              {t("send")}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setForm(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="touch" className="sm:flex-1" disabled={pending || !name.trim()} onClick={() => decide("approved")}>
            {t("approve")}
          </Button>
          <Button variant="secondary" size="touch" className="sm:flex-1" onClick={() => setForm(true)}>
            {t("askChanges")}
          </Button>
        </div>
      )}
      {error && <span role="alert" className="text-[14px] text-red-ink">{error}</span>}
    </div>
  );
}

/** For a video that isn't waiting on the client (approved, scheduled, published): ask for a change anyway. */
export function RequestChange({ token, taskId }: { token: string; taskId: string }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const [name, setName] = useApprover();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      const res = await requestChange(token, taskId, name, comment);
      if (!res.ok) return setError(res.error);
      setError(null);
      setOpen(false);
      setComment("");
      setSent(true);
      router.refresh();
    });

  if (sent)
    return (
      <span className="snf-in flex items-center gap-2 rounded-lg border border-[var(--status-waiting)] px-5 py-4 text-[15px] font-medium text-[var(--waiting-ink)]">
        <DrawnCheck size={18} />
        {t("changeSent")}
      </span>
    );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-12 cursor-pointer self-start rounded-md border border-line2 px-5 text-[15px] font-medium text-ink hover:border-ink3">
        {t("requestChange")}
      </button>
    );
  return (
    <div className="flex flex-col gap-4">
      <span className="text-[14px] text-ink2">{t("requestChangeHint")}</span>
      <NameField name={name} setName={setName} />
      <textarea
        autoFocus
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder={t("changesPlaceholder")}
        className="resize-y rounded-md border border-accent bg-transparent px-4 py-3.5 text-[15px] leading-normal text-ink outline-none"
      />
      <div className="flex flex-wrap gap-3">
        <Button size="md" disabled={pending || !comment.trim() || !name.trim()} onClick={send}>
          {t("send")}
        </Button>
        <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
      {error && <span role="alert" className="text-[14px] text-red-ink">{error}</span>}
    </div>
  );
}
