"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { Decision } from "@/lib/portal";
import type { ScriptSection } from "@/lib/tasks";
import { approveAllScripts, decideScript } from "../../actions";
import { useApprover } from "../../useApprover";
import { NameField } from "../../video/[taskId]/VideoDecision";

type Item = { id: string; title: string; time: string | null; onCamera: string | null; type: string | null; script: ScriptSection[]; decision: Decision | null };

const STATE_COLOR = { pending: "var(--accent)", approved: "var(--status-done)", changes: "var(--status-waiting)" };

export function ScriptApprovals({ token, shootId, videos, canDecide }: { token: string; shootId: string; videos: Item[]; canDecide: boolean }) {
  const t = useTranslations("portal");
  const router = useRouter();
  const [name, setName] = useApprover();
  const [open, setOpen] = useState<string | null>(null);
  const [changesFor, setChangesFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approved = videos.filter((v) => v.decision?.status === "approved").length;
  const changes = videos.filter((v) => v.decision?.status === "changes").length;
  const remaining = videos.filter((v) => !v.decision).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? null);
      setError(null);
      setChangesFor(null);
      setComment("");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 lg:max-w-[520px]">
          <span className="text-[14px] font-medium">{t("scriptsProgress", { approved, total: videos.length, changes })}</span>
          <div className="h-2 overflow-hidden rounded-full bg-chip">
            <div className="h-full rounded-full bg-[var(--status-done)]" style={{ width: `${(approved / videos.length) * 100}%` }} />
          </div>
        </div>
        {canDecide && remaining > 0 && (
          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => run(() => approveAllScripts(token, shootId, name))}
            className="h-12 cursor-pointer rounded-md bg-accent px-5 text-[14px] font-semibold uppercase tracking-[0.1em] text-charcoal disabled:opacity-45"
          >
            {t("approveAll", { count: remaining })}
          </button>
        )}
      </div>
      {canDecide && remaining > 0 && (
        <div className="max-w-[420px]">
          <NameField name={name} setName={setName} />
        </div>
      )}
      {error && <span role="alert" className="text-[14px] text-red-ink">{error}</span>}

      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surf">
        {videos.map((v) => {
          const state = v.decision?.status ?? "pending";
          const isOpen = open === v.id;
          return (
            <div key={v.id} className="flex flex-col border-t border-line first:border-t-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 md:grid-cols-[60px_minmax(0,1fr)_64px_110px_auto]">
                <span className="hidden text-[14px] font-semibold md:block">{v.time ?? ""}</span>
                <button type="button" onClick={() => setOpen(isOpen ? null : v.id)} className="flex min-w-0 cursor-pointer flex-col gap-1 text-left">
                  <span className="text-[15px] font-medium leading-snug">{v.title}</span>
                  <span className="truncate text-[13px] text-ink3">
                    {[v.time && `${v.time}`, v.onCamera].filter(Boolean).join(" · ") || " "}
                  </span>
                </button>
                <span className="hidden md:block">
                  {v.type && <span className="rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em] text-ink2">{v.type}</span>}
                </span>
                <span className="hidden items-center gap-2 text-[13px] font-medium text-ink2 md:flex">
                  <span className="size-2 rounded-full" style={{ background: STATE_COLOR[state] }} />
                  {t(`scriptStatus.${state}`)}
                </span>
                {canDecide && (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={pending || !name.trim()}
                      onClick={() => {
                        setOpen(v.id);
                        setChangesFor(changesFor === v.id ? null : v.id);
                      }}
                      className={`h-9 cursor-pointer rounded-md border px-3 text-[13px] font-medium disabled:opacity-45 ${
                        state === "changes" ? "border-[var(--status-waiting)] bg-[rgba(214,169,62,0.18)] text-[var(--status-waiting)]" : "border-line2 text-ink2"
                      }`}
                    >
                      {t("changes")}
                    </button>
                    <button
                      type="button"
                      disabled={pending || !name.trim() || state === "approved"}
                      onClick={() => run(() => decideScript(token, v.id, "approved", name, ""))}
                      className={`h-9 cursor-pointer rounded-md border px-3 text-[13px] font-semibold disabled:cursor-default ${
                        state === "approved" ? "border-[var(--status-done)] bg-[var(--status-done)] text-ink-black" : "border-line2 text-ink disabled:opacity-45"
                      }`}
                    >
                      {t("approve")}
                    </button>
                  </span>
                )}
              </div>
              {isOpen && (
                <div className="flex flex-col gap-3 bg-chip px-4 pb-5 pt-2 md:pl-[88px]">
                  {v.script.length ? (
                    v.script.map((s, i) => (
                      <span key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2">
                        <span className="font-semibold text-accent">{s.label}</span> {s.text}
                      </span>
                    ))
                  ) : (
                    <span className="text-[14px] text-ink3">—</span>
                  )}
                  {v.decision?.comment && <span className="text-[14px] text-[var(--status-waiting)]">“{v.decision.comment}” — {v.decision.approver_name}</span>}
                  {changesFor === v.id && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        autoFocus
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder={t("changesPlaceholder")}
                        className="resize-y rounded-md border border-accent bg-transparent px-3.5 py-3 text-[15px] text-ink outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending || !comment.trim()}
                          onClick={() => run(() => decideScript(token, v.id, "changes", name, comment))}
                          className="h-10 cursor-pointer rounded-md bg-accent px-4 text-[14px] font-semibold text-charcoal disabled:opacity-45"
                        >
                          {t("send")}
                        </button>
                        <button type="button" onClick={() => setChangesFor(null)} className="h-10 cursor-pointer px-3 text-[14px] text-ink2">
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
