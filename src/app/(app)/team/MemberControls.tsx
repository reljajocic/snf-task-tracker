"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { updateMember } from "./actions";

export function MemberControls({ userId, role, active, partner }: { userId: string; role: "admin" | "user"; active: boolean; partner: boolean }) {
  const t = useTranslations("team");
  const [pending, startTransition] = useTransition();
  const run = (patch: { role?: "admin" | "user"; is_active?: boolean; is_partner?: boolean }) =>
    startTransition(async () => {
      const res = await updateMember(userId, patch);
      if (res.error) window.alert(res.error);
    });

  return (
    <span className="flex items-center gap-3">
      {/* Partners share the earnings and see all invoices and costs. */}
      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-ink2">
        <input type="checkbox" checked={partner} disabled={pending} onChange={() => run({ is_partner: !partner })} className="accent-[var(--accent)]" />
        {t("partner")}
      </label>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => run({ role: e.target.value as "admin" | "user" })}
        className="h-8 cursor-pointer rounded-md border border-line2 bg-transparent px-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink2"
      >
        <option value="user">{t("roleUser")}</option>
        <option value="admin">{t("roleAdmin")}</option>
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => run({ is_active: !active })}
        className={`cursor-pointer text-[12px] font-medium ${active ? "text-ink3 hover:text-red-ink" : "text-rust-ink"}`}
      >
        {active ? t("deactivate") : t("reactivate")}
      </button>
    </span>
  );
}
