"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// A small window over the page, for forms that don't fit ask()/tell() from Dialog.tsx.
// Opaque surface, the shared overlay and shadow, Esc or a click outside closes it, focus moves in,
// stays in (Tab cycles) and goes back to where it was on close.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  onClose,
  children,
  className = "",
  z = "z-[60]",
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  z?: string;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const el = box.current;
    (el?.querySelector<HTMLElement>("[autofocus], input, textarea, select") ?? el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === "Tab" && el) {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    // The page behind doesn't scroll while the window is open (phones especially).
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key, true);
      html.style.overflow = was;
      before?.focus?.();
    };
  }, []);

  return createPortal(
    <div className={`fixed inset-0 ${z} grid place-items-center bg-[var(--overlay)] p-5`}>
      <div aria-hidden onClick={onClose} className="absolute inset-0" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={`relative flex w-full flex-col gap-4 rounded-lg border border-line2 bg-bg p-6 shadow-[var(--shadow-overlay)] outline-none ${className}`}
      >
        <h2 id={id} className="self-stretch text-[18px] font-semibold leading-snug text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
