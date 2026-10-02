"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Person } from "@/lib/tasks";
import { setClientMember } from "../actions";

type Member = Person & { role: "manager" | "member" };

/** Who works on this client. Only admins change it (managers/members per client). */
export function ClientTeam({ clientId, members, people, isAdmin }: { clientId: string; members: Member[]; people: Person[]; isAdmin: boolean }) {
  const t = useTranslations("clients");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState("");

  const run = (userId: string, role: "manager" | "member" | null) =>
    startTransition(async () => {
      const res = await setClientMember(clientId, userId, role);
      setError(res.error);
      setAdding("");
    });

  const sorted = [...members].sort((a, b) => (a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === "manager" ? -1 : 1));
  const available = people.filter((p) => !members.some((m) => m.id === p.id));

  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="display text-[19px] leading-[1.1] lg:text-[20px]">{t("team")}</h2>
      <div className="flex flex-col rounded-lg border border-line bg-surf px-4 py-1.5">
        {sorted.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
            <Avatar person={m} size={28} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{m.full_name}</span>
            <span className={`rounded-[3px] border px-1.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${m.role === "manager" ? "border-accent text-rust-ink" : "border-line2 text-ink2"}`}>
              {m.role === "manager" ? t("manager") : t("member")}
            </span>
            {isAdmin && (
              <span className="flex gap-2 text-[12px]">
                <button type="button" disabled={pending} onClick={() => run(m.id, m.role === "manager" ? "member" : "manager")} className="cursor-pointer text-ink3 hover:text-ink">
                  {m.role === "manager" ? t("makeMember") : t("makeManager")}
                </button>
                <button type="button" disabled={pending} onClick={() => run(m.id, null)} aria-label={t("remove")} className="cursor-pointer text-ink3 hover:text-red-ink">
                  ×
                </button>
              </span>
            )}
          </div>
        ))}
        {!members.length && <p className="py-3 text-[14px] text-ink3">{t("noTeam")}</p>}
      </div>
      {isAdmin && available.length > 0 && (
        <div className="flex gap-2">
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-line2 bg-transparent px-3 text-[14px] text-ink">
            <option value="">{t("addPerson")}…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <button type="button" disabled={!adding || pending} onClick={() => run(adding, "member")} className="h-9 cursor-pointer rounded-md border border-line2 px-3 text-[13px] font-medium disabled:opacity-45">
            {t("member")}
          </button>
          <button type="button" disabled={!adding || pending} onClick={() => run(adding, "manager")} className="h-9 cursor-pointer rounded-md border border-line2 px-3 text-[13px] font-medium disabled:opacity-45">
            {t("manager")}
          </button>
        </div>
      )}
      <p className="text-[12.5px] leading-snug text-ink3">{t("teamHint")}</p>
      {error && <p role="alert" className="text-[13px] text-red-ink">{error}</p>}
    </section>
  );
}
