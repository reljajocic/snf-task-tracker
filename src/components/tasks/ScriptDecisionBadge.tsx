"use client";

import { useTranslations } from "next-intl";
import type { ScriptDecision } from "@/lib/tasks";

/** The client's word on a script from the portal: "✓ Approved · Ana" or "Changes · Ana" (comment on hover). */
export function ScriptDecisionBadge({ decision, full = false }: { decision: ScriptDecision | null; full?: boolean }) {
  const t = useTranslations("scriptApproval");
  if (!decision) return null;
  const approved = decision.status === "approved";
  const label = approved ? t("approvedShort", { name: decision.approver_name }) : t("changesShort", { name: decision.approver_name });
  return (
    <span className="inline-flex max-w-full flex-col gap-1">
      <span
        title={decision.comment ?? undefined}
        className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-semibold leading-none ${
          approved ? "bg-[rgba(91,155,107,0.16)] text-[var(--status-done)]" : "bg-[rgba(214,169,62,0.18)] text-[var(--status-waiting)]"
        }`}
      >
        {approved ? "✓" : "✎"} {label}
      </span>
      {full && decision.comment && <span className="text-[13px] leading-snug text-[var(--status-waiting)]">“{decision.comment}”</span>}
    </span>
  );
}
