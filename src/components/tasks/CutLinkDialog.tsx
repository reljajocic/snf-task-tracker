"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "./fields";

export type CutLink = { url: string; note: string; notifyClient: boolean };

/**
 * Asked when a video leaves Edit (the first cut, or the fixes after the client's changes): where the cut is on Drive.
 * To Revision it goes to the client as the next version; further on (Publish, Published) it's the video's Drive link.
 * Cancel, Escape or a click outside leaves the video where it was.
 */
export function CutLinkDialog({
  title,
  review,
  initialUrl,
  onSave,
  onSkip,
  onCancel,
}: {
  title: string;
  /** Going to the client for review (a new version), rather than on to publishing. */
  review: boolean;
  initialUrl: string;
  onSave: (link: CutLink) => Promise<string | null>;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("cutLink");
  const tc = useTranslations("common");
  const tv = useTranslations("versions");
  const [url, setUrl] = useState(initialUrl);
  const [note, setNote] = useState("");
  const [notifyClient, setNotifyClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // While it saves, it can't be closed: closing would look like cancelling, yet the version would still go out.
  const cancel = () => !pending && onCancel();

  return (
    <Modal title={t(review ? "titleReview" : "titlePublish")} onClose={cancel} z="z-[70]" className="max-w-[540px]">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!url.trim() || pending) return;
          setPending(true);
          const err = await onSave({ url: url.trim(), note, notifyClient });
          setPending(false);
          if (err) setError(err);
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-[14px] leading-relaxed text-ink2">{t(review ? "bodyReview" : "bodyPublish", { title })}</p>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink3">{t("link")}</span>
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="drive.google.com/…" autoComplete="off" className={inputClass} />
        </label>
        {review && (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink3">{tv("note")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-md border border-line2 bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] text-ink2 sm:min-h-0">
              <input type="checkbox" checked={notifyClient} onChange={(e) => setNotifyClient(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              {tv("notify")}
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-[13px] font-medium text-red-ink">
            {error}
          </p>
        )}
        <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
          <Button variant="ghost" size="sm" onClick={cancel} disabled={pending} className="sm:mr-auto">
            {tc("cancel")}
          </Button>
          <Button variant="secondary" size="sm" onClick={onSkip} disabled={pending}>
            {t("skip")}
          </Button>
          <Button type="submit" size="sm" disabled={!url.trim() || pending}>
            {t(review ? "saveReview" : "savePublish")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
