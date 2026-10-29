"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { ask } from "@/components/ui/Dialog";
import { formatDate } from "@/lib/dates";
import type { Partner } from "@/lib/finance";
import { parseAmount, type Subscription } from "@/lib/invoices";
import { endSubscription, saveSubscription } from "../actions";
import { Field, Section } from "../form-bits";
import { PageTitle } from "@/components/shell/PageTitle";

type ClientOpt = { id: string; name: string };

/** A monthly cost: what, how much, on which day of the month, from when (until when). Each month it becomes a cost. */
export function SubscriptionForm({ sub, clients, partners, today }: { sub: Subscription | null; clients: ClientOpt[]; partners: Partner[]; today: string }) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: sub?.name ?? "",
    amount: sub ? String(sub.amount) : "",
    supplier: sub?.supplier ?? "",
    day_of_month: String(sub?.day_of_month ?? Number(today.slice(8))),
    starts_on: sub?.starts_on ?? today,
    ends_on: sub?.ends_on ?? "",
    client_id: sub?.client_id ?? "",
    profile_id: sub?.profile_id ?? "",
  });
  const set = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));
  const list = "/invoices/expenses?view=subscriptions";
  const ended = !!sub?.ends_on && sub.ends_on <= today;

  const submit = () => {
    const amount = parseAmount(f.amount);
    if (!f.name.trim()) return setError(t("subNameMissing"));
    if (!(amount > 0)) return setError(t("expenseAmountInvalid"));
    setError(null);
    start(async () => {
      const res = await saveSubscription({
        id: sub?.id ?? null,
        name: f.name,
        amount,
        supplier: f.supplier,
        client_id: f.client_id || null,
        profile_id: f.profile_id || null,
        day_of_month: Number(f.day_of_month),
        starts_on: f.starts_on,
        ends_on: f.ends_on || null,
      });
      if (res.error) return setError(res.error);
      router.push(list);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex max-w-[760px] flex-col gap-6"
    >
      <PageTitle
        back={{ href: list, label: t("subscriptions") }}
        title={sub ? sub.name : t("newSubscription")}
        sub={
          <>
            <p className="text-[14px] text-ink2">{t("subscriptionLead")}</p>
            {ended && <p className="text-[14px] font-medium text-ink3">{t("subEnded", { date: formatDate(sub!.ends_on!) })}</p>}
          </>
        }
      />

      <Section title={t("subWhat")}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
          <Field label={t("subName")} wide>
            <input autoFocus={!sub} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Higgsfield AI, Knjigovođa, Adobe…" className={inputClass} />
          </Field>
          <Field label={`${t("subAmount")} (RSD)`} hint={t("amountHint")}>
            <input inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="6.000" className={`${inputClass} text-right`} />
          </Field>
          <Field label={t("subDay")} hint={t("subDayHint")}>
            <input type="number" min={1} max={31} value={f.day_of_month} onChange={(e) => set({ day_of_month: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("subStarts")} hint={t("subStartsHint")}>
            <input type="date" value={f.starts_on} onChange={(e) => set({ starts_on: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("subEnds")} hint={t("subEndsHint")}>
            <input type="date" value={f.ends_on} onChange={(e) => set({ ends_on: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("supplier")} wide>
            <input value={f.supplier} onChange={(e) => set({ supplier: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title={t("expenseWho")}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
          <Field label={t("forClient")}>
            <select value={f.client_id} onChange={(e) => set({ client_id: e.target.value })} className={`${selectClass} h-[42px]`}>
              <option value="">{t("noClient")}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t("paidBy")}>
            <select value={f.profile_id} onChange={(e) => set({ profile_id: e.target.value })} className={`${selectClass} h-[42px]`}>
              <option value="">{t("splitBetween")}</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{t("onlyFor", { name: p.full_name })}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
        {error && <p role="alert" className="mr-auto text-[13px] text-red-ink">{error}</p>}
        {sub && !ended && (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!(await ask({ title: t("subEndConfirm", { name: sub.name }), body: t("subEndBody"), confirm: t("subEnd"), danger: true }))) return;
              start(async () => {
                await endSubscription(sub.id, today);
                router.push(list);
              });
            }}
            className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
          >
            {t("subEnd")}
          </button>
        )}
        <Link href={list} className="flex h-10 items-center px-4 text-[14px] font-medium text-ink2">{t("discard")}</Link>
        <Button type="submit" size="sm" disabled={pending}>{sub ? t("save") : t("addSubscription")}</Button>
      </div>
    </form>
  );
}
