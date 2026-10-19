"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/tasks/fields";

// The app's own confirm/alert, in place of the browser's pop-ups. Call from any handler:
//   if (!(await ask({ title: t("deleteConfirm"), confirm: t("delete"), danger: true }))) return;
//   await tell({ title: res.error });
// One <DialogHost /> (in the app layout) shows them, one at a time.

type Req = {
  title: string;
  body?: string;
  confirm?: string;
  cancel?: string | false; // false: only the confirm button (an alert)
  danger?: boolean;
  /** The user has to type this exactly before the confirm button works (deleting something big). */
  typeToConfirm?: string;
  resolve: (ok: boolean) => void;
};

let queue: Req[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const current = () => queue[0] ?? null;

function open(r: Omit<Req, "resolve">) {
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { ...r, resolve }];
    emit();
  });
}

/** Asks the user; true when they confirm. */
export const ask = (r: Omit<Req, "resolve">) => open(r);
/** Tells the user something (an error, mostly); resolves when they close it. */
export const tell = (r: Pick<Req, "title" | "body" | "confirm">) => open({ ...r, cancel: false }).then(() => undefined);

export function DialogHost() {
  const req = useSyncExternalStore(subscribe, current, () => null);
  return req ? <DialogBox key={queue.length + req.title} req={req} /> : null;
}

function DialogBox({ req }: { req: Req }) {
  const t = useTranslations("common");
  const [typed, setTyped] = useState("");
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = !!req.typeToConfirm && typed.trim() !== req.typeToConfirm.trim();
  const alertOnly = req.cancel === false;

  const close = (ok: boolean) => {
    queue = queue.slice(1);
    req.resolve(ok);
    emit();
  };

  useEffect(() => {
    (req.typeToConfirm ? inputRef.current : okRef.current)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(alertOnly);
      }
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[var(--overlay)] p-5">
      <button type="button" aria-label={t("cancel")} onClick={() => close(alertOnly)} className="absolute inset-0 cursor-default" />
      <form
        role={alertOnly ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="snf-dialog-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (!blocked) close(true);
        }}
        className="relative flex w-full max-w-[440px] flex-col gap-4 rounded-[10px] border border-line2 bg-bg p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <h2 id="snf-dialog-title" className="text-[17px] font-semibold leading-snug text-ink">
          {req.title}
        </h2>
        {req.body && <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink2">{req.body}</p>}
        {req.typeToConfirm && (
          <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={req.typeToConfirm} autoComplete="off" className={inputClass} />
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-2.5">
          {!alertOnly && (
            <Button variant="secondary" size="sm" onClick={() => close(false)}>
              {req.cancel || t("cancel")}
            </Button>
          )}
          <Button
            ref={okRef}
            type="submit"
            size="sm"
            disabled={blocked}
            className={req.danger ? "!bg-[var(--red-ink)] !text-bg" : undefined}
          >
            {req.confirm || t("ok")}
          </Button>
        </div>
      </form>
    </div>
  );
}
