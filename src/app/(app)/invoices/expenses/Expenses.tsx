"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { inputClass, selectClass } from "@/components/tasks/fields";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/dates";
import type { Partner } from "@/lib/finance";
import { money, type Expense } from "@/lib/invoices";
import { deleteExpense, saveExpense, type ExpenseInput } from "../actions";
import { ask } from "@/components/ui/Dialog";
import { safeHref } from "@/lib/safe-url";

type ClientOpt = { id: string; name: string };

const blank = (today: string): ExpenseInput => ({ id: null, spent_on: today, description: "", amount: 0, supplier: "", client_id: null, profile_id: null, doc_url: "" });

/** Costs by month: add one at the top, click a row to change it. */
export function Expenses({ expenses, clients, partners, today, monthLabels }: { expenses: Expense[]; clients: ClientOpt[]; partners: Partner[]; today: string; monthLabels: Record<string, string> }) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [form, setForm] = useState<ExpenseInput>(blank(today));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const edit = (e: Expense) => {
    setForm({ ...e, supplier: e.supplier ?? "", doc_url: e.doc_url ?? "" });
    setAmount(String(e.amount));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => {
    setForm(blank(today));
    setAmount("");
    setError(null);
  };
  const submit = () =>
    start(async () => {
      const res = await saveExpense({ ...form, amount: Number(amount.replace(",", ".")) });
      if (res.error) return setError(res.error);
      reset();
      router.refresh();
    });

  const months = [...new Set(expenses.map((e) => e.spent_on.slice(0, 7)))];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const who = (id: string | null) => (id ? partners.find((p) => p.id === id)?.full_name ?? "—" : t("everyone"));

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surf p-4 lg:grid-cols-[150px_minmax(0,1fr)_150px_minmax(0,0.8fr)]"
      >
        <input type="date" aria-label={t("spentOn")} value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} className={inputClass} />
        <input aria-label={t("amount")} inputMode="decimal" placeholder={`${t("amount")} (RSD)`} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} text-right lg:order-3`} />
        <input aria-label={t("what")} placeholder={t("what")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} col-span-2 lg:order-2 lg:col-span-1`} />
        <input aria-label={t("supplier")} placeholder={t("supplier")} value={form.supplier ?? ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className={`${inputClass} col-span-2 lg:order-4 lg:col-span-1`} />
        <select aria-label={t("forClient")} value={form.client_id ?? ""} onChange={(e) => setForm({ ...form, client_id: e.target.value || null })} className={`${selectClass} h-[42px] lg:order-5`}>
          <option value="">{t("noClient")}</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label={t("paidBy")} value={form.profile_id ?? ""} onChange={(e) => setForm({ ...form, profile_id: e.target.value || null })} className={`${selectClass} h-[42px] lg:order-6`}>
          <option value="">{t("splitBetween")}</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{t("onlyFor", { name: p.full_name })}</option>)}
        </select>
        <input aria-label={t("docUrl")} placeholder={t("docUrl")} value={form.doc_url ?? ""} onChange={(e) => setForm({ ...form, doc_url: e.target.value })} className={`${inputClass} col-span-2 lg:order-7 lg:col-span-1`} />
        <div className="col-span-2 flex items-center justify-end gap-3 lg:order-8 lg:col-span-1">
          {error && <span role="alert" className="mr-auto text-[13px] text-red-ink">{error}</span>}
          {form.id && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={async () =>
                  (await ask({ title: t("deleteExpenseConfirm"), confirm: t("delete"), danger: true })) &&
                  start(async () => {
                    await deleteExpense(form.id!);
                    reset();
                    router.refresh();
                  })
                }
                className="mr-auto cursor-pointer text-[13px] font-medium text-red-ink"
              >
                {t("delete")}
              </button>
              <button type="button" onClick={reset} className="cursor-pointer text-[13px] font-medium text-ink3 hover:text-ink">{t("discard")}</button>
            </>
          )}
          <Button type="submit" size="sm" disabled={pending}>{form.id ? t("save") : t("addExpense")}</Button>
        </div>
      </form>

      {months.length ? (
        months.map((m) => {
          const list = expenses.filter((e) => e.spent_on.startsWith(m));
          return (
            <section key={m} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{monthLabels[m] ?? m}</h2>
                <span className="text-[15px] font-semibold tabular-nums">{money(list.reduce((s, e) => s + e.amount, 0))} RSD</span>
              </div>
              <div className="snf-stack">
                {list.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => edit(e)}
                    className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-[18px] py-3 text-left last:border-b-0 hover:bg-hover lg:grid-cols-[90px_minmax(0,1fr)_160px_150px_130px] ${form.id === e.id ? "bg-hover" : ""}`}
                  >
                    <span className="hidden text-[14px] tabular-nums text-ink3 lg:block">{formatDate(e.spent_on)}</span>
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate text-[15px] font-medium">{e.description}</span>
                      {(e.supplier || e.doc_url) && (
                        <span className="truncate text-[13px] text-ink3">
                          {e.supplier}
                          {e.doc_url && (
                            <a href={safeHref(e.doc_url)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="ml-2 text-rust-ink hover:underline">
                              {t("doc")}
                            </a>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="hidden truncate text-[13px] text-ink2 lg:block">{e.client_id ? clientName.get(e.client_id) : ""}</span>
                    <span className="hidden truncate text-[13px] text-ink2 lg:block">{who(e.profile_id)}</span>
                    <span className="justify-self-end text-[15px] font-semibold tabular-nums">{money(e.amount)}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("noExpenses")}</p>
      )}
    </div>
  );
}
