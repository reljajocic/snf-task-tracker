import { displayLabel } from "@/lib/script-text";

/**
 * A script part's name (Hook, Body 1, CTA): a quiet grey word in sentence case, so the script itself is what
 * reads first. One style everywhere a script is shown.
 */
/** `tight`: stacked above the text (no line height of its own); otherwise it sits on the text's first line. */
export function ScriptLabel({ label, tight = false, className = "" }: { label: string; tight?: boolean; className?: string }) {
  if (!label.trim()) return null;
  return <span className={`text-[13px] font-semibold text-ink3 ${tight ? "leading-none" : "leading-[1.55]"} ${className}`}>{displayLabel(label)}</span>;
}
