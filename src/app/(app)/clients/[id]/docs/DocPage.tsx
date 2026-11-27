"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { DocBody } from "@/components/DocBody";
import { inputClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { ask } from "@/components/ui/Dialog";
import { DrawnCheck } from "@/components/ui/DrawnCheck";
import { deleteClientDoc, saveClientDoc } from "./actions";

export type ClientDoc = { id: string; title: string; body: string; updated_at: string; updated_by: string | null };

/** One page of a client's docs: read it, or (the client's team) edit it in place. */
export function DocPage({ clientId, doc, canEdit, editedBy, editedOn, startEditing }: { clientId: string; doc: ClientDoc; canEdit: boolean; editedBy: string | null; editedOn: string; startEditing: boolean }) {
  const t = useTranslations("docs");
  const router = useRouter();
  const [editing, setEditing] = useState(startEditing && canEdit);
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = title !== doc.title || body !== doc.body;

  // The text box grows with the page instead of scrolling inside it.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(320, el.scrollHeight + 2)}px`;
  }, [body, editing]);

  // Don't lose unsaved edits by closing the tab.
  useEffect(() => {
    if (!editing || !dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [editing, dirty]);

  const save = () =>
    start(async () => {
      const res = await saveClientDoc(clientId, doc.id, { title, body });
      setError(res.error);
      if (res.error) return;
      setSaved(true);
      setEditing(false);
      router.replace(`/clients/${clientId}/docs?d=${doc.id}`, { scroll: false });
      router.refresh();
    });

  const remove = async () => {
    if (!(await ask({ title: t("deleteConfirm", { title: doc.title }), confirm: t("delete"), danger: true }))) return;
    start(async () => {
      const res = await deleteClientDoc(clientId, doc.id);
      if (res.error) return setError(res.error);
      router.replace(`/clients/${clientId}/docs`);
      router.refresh();
    });
  };

  const cancel = () => {
    setTitle(doc.title);
    setBody(doc.body);
    setError(null);
    setEditing(false);
  };

  if (editing)
    return (
      <div className="flex flex-col gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label={t("pageTitle")} placeholder={t("pageTitle")} className={`${inputClass} h-12 text-[18px] font-semibold`} autoFocus={!doc.body} />
        <textarea
          ref={area}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              save();
            }
          }}
          aria-label={t("pageBody")}
          placeholder={t("bodyPlaceholder")}
          autoFocus={!!doc.body}
          className={`${inputClass} h-auto min-h-[320px] resize-none overflow-hidden py-3 font-mono text-[14px] leading-relaxed`}
        />
        <p className="text-[13px] leading-snug text-ink3">{t("formatHint")}</p>
        <div className="sticky bottom-[calc(var(--nav-room)-8px)] z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 bg-[var(--canvas)] px-1 py-2 lg:bottom-0">
          {error && <span role="alert" className="mr-auto text-[13px] text-red-ink">{error}</span>}
          <button type="button" disabled={pending} onClick={remove} className="mr-auto h-10 cursor-pointer px-1 text-[13px] font-medium text-red-ink disabled:opacity-45">
            {t("delete")}
          </button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={cancel}>
            {t("cancel")}
          </Button>
          <Button type="button" size="sm" disabled={pending || !title.trim()} onClick={save}>
            {t("save")}
          </Button>
        </div>
      </div>
    );

  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="display text-[26px] leading-[1.05] lg:text-[30px]">{doc.title}</h2>
          <p className="flex items-center gap-1.5 text-[13px] text-ink3">
            {saved && (
              <span className="snf-saved inline-flex items-center gap-1 font-medium text-[var(--status-done)]">
                <DrawnCheck size={14} />
                {t("saved")}
              </span>
            )}
            {editedBy ? t("editedBy", { name: editedBy, date: editedOn }) : t("editedOn", { date: editedOn })}
          </p>
        </div>
        {canEdit && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        )}
      </div>
      {doc.body.trim() ? <DocBody body={doc.body} /> : <p className="text-[15px] text-ink3">{canEdit ? t("emptyPageEdit") : t("emptyPage")}</p>}
    </article>
  );
}
