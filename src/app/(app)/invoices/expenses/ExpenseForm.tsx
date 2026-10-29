"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { ask } from "@/components/ui/Dialog";
import type { Partner } from "@/lib/finance";
import { parseAmount, type Expense } from "@/lib/invoices";
import { deleteExpense, saveExpense } from "../actions";
import { Field, Section } from "../form-bits";
import { PageTitle } from "@/components/shell/PageTitle";

type ClientOpt = { id: string; name: string };

/**
 * One cost, on its own page: what it was and how much, the supplier's invoice if one came (number, paid on,
 * the PDF), and whom it's for. Everything has a label; only "what" and "how much" are required.
 */
export function ExpenseForm({ expense, clients, partners, today }: { expense: Expense | null; clients: ClientOpt[]; partners: Partner[]; today: string }) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    spent_on: expense?.spent_on ?? today,
    description: expense?.description ?? "",
    amount: expense ? String(expense.amount) : "",
    supplier: expense?.supplier ?? "",
    invoice_no: expense?.invoice_no ?? "",
    paid_on: expense?.paid_on ?? "",
    doc_url: expense?.doc_url ?? "",
    client_id: expense?.client_id ?? "",
    profile_id: expense?.profile_id ?? "",
  });
  const set = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));
  const back = expense ? `/invoices/expenses/${expense.id}` : "/invoices/expenses";

  const submit = () => {
    const amount = parseAmount(f.amount);
    if (!f.description.trim()) return setError(t("expenseWhatMissing"));
    if (!(amount > 0)) return setError(t("expenseAmountInvalid"));
    setError(null);
    start(async () => {
      const res = await saveExpense({
        id: expense?.id ?? null,
        spent_on: f.spent_on,
        description: f.description,
        amount,
        supplier: f.supplier,
        client_id: f.client_id || null,
        profile_id: f.profile_id || null,
        doc_url: f.doc_url,
        invoice_no: f.invoice_no,
        paid_on: f.paid_on || null,
      });
      if (res.error) return setError(res.error);
      router.push(res.id ? `/invoices/expenses/${res.id}` : "/invoices/expenses");
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
      <PageTitle back={{ href: back, label: expense ? expense.description : t("expensesTitle") }} title={expense ? t("editExpense") : t("newExpense")} />

      <Section title={t("expenseWhat")}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
          <Field label={t("what")} wide>
            <input autoFocus={!expense} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder={t("whatPlaceholder")} className={inputClass} />
          </Field>
          <Field label={`${t("amount")} (RSD)`} hint={t("amountHint")}>
            <input inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="4.720" className={`${inputClass} text-right`} />
          </Field>
          <Field label={t("spentOn")}>
            <input type="date" value={f.spent_on} onChange={(e) => set({ spent_on: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </Section>

      <Section title={t("receivedSection")}>
        <p className="-mt-2 text-[13px] text-ink3">{t("receivedSectionHint")}</p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
          <Field label={t("supplier")} wide>
            <input value={f.supplier} onChange={(e) => set({ supplier: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("receivedNo")}>
            <input value={f.invoice_no} onChange={(e) => set({ invoice_no: e.target.value })} placeholder="202/26" className={inputClass} />
          </Field>
          <Field label={t("receivedPaidOn")}>
            <input type="date" value={f.paid_on} onChange={(e) => set({ paid_on: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("docUrl")} wide hint={t("docUrlHint")}>
            <input value={f.doc_url} onChange={(e) => set({ doc_url: e.target.value })} placeholder="https://drive.google.com/file/d/…" className={inputClass} />
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
        {expense && (
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!(await ask({ title: t("deleteExpenseConfirm"), confirm: t("delete"), danger: true }))) return;
              start(async () => {
                await deleteExpense(expense.id);
                router.push("/invoices/expenses");
              });
            }}
            className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
          >
            {t("delete")}
          </button>
        )}
        <Link href={back} className="flex h-10 items-center px-4 text-[14px] font-medium text-ink2">{t("discard")}</Link>
        <Button type="submit" size="sm" disabled={pending}>{expense ? t("save") : t("addExpense")}</Button>
      </div>
    </form>
  );
}
