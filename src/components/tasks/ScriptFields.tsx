"use client";

import { useTranslations } from "next-intl";
import type { ScriptSection } from "@/lib/tasks";

/**
 * A script edited as one document: labels in a gutter on the left, the text at reading size on the right, a hairline
 * between parts (like the shoot sheet), instead of a bordered box per part. Text fields grow with what's typed.
 * The × to remove a part shows on hover or while it's being edited (always on screens without hover).
 */
export function ScriptFields({
  sections,
  onChange,
  onRemove,
  onBlur,
  disabled = false,
}: {
  sections: ScriptSection[];
  onChange: (i: number, patch: Partial<ScriptSection>) => void;
  onRemove: (i: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("video");
  return (
    <div className="rounded-md border border-line bg-surf focus-within:border-line2">
      {sections.map((s, i) => (
        <div
          key={i}
          className="group/part relative grid grid-cols-1 gap-0.5 border-t border-line px-4 pb-3 pr-12 pt-2.5 first:border-t-0 focus-within:shadow-[inset_2px_0_0_var(--accent)] sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-4 sm:py-3 sm:pr-11"
        >
          <input
            value={s.label}
            disabled={disabled}
            aria-label={t("sectionLabel")}
            placeholder={t("sectionLabel")}
            onChange={(e) => onChange(i, { label: e.target.value })}
            onBlur={onBlur}
            className="h-8 min-w-0 border-0 bg-transparent text-[12px] font-semibold uppercase tracking-[0.12em] text-accent outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-ink3 focus-visible:shadow-none sm:h-[23px] sm:text-[11px]"
          />
          <textarea
            value={s.text}
            disabled={disabled}
            aria-label={s.label || t("sectionLabel")}
            rows={Math.max(1, s.text.split("\n").length, Math.ceil(s.text.length / 70))}
            onChange={(e) => onChange(i, { text: e.target.value })}
            onBlur={onBlur}
            className="min-h-11 resize-none sm:min-h-[23px] border-0 bg-transparent p-0 text-[16px] leading-[1.55] text-ink outline-none [field-sizing:content] focus-visible:shadow-none sm:text-[15px]"
          />
          {!disabled && (
            <button
              type="button"
              aria-label={t("removeSection")}
              title={t("removeSection")}
              onClick={() => onRemove(i)}
              className="absolute right-1 top-1 grid size-11 cursor-pointer place-items-center rounded-md text-[18px] leading-none text-ink3 hover:bg-hover hover:text-red-ink focus-visible:opacity-100 sm:right-1.5 sm:top-1.5 sm:size-9 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/part:opacity-100 [@media(hover:hover)]:group-hover/part:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
