"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { inputClass, selectClass } from "@/components/tasks/fields";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClass } from "@/components/ui/Button";
import { DEFAULT_ITEM, invoiceNumber, money, presetShares, totalRsd, type Buyer, type Currency, type Invoice, type InvoiceItem, type Issuer } from "@/lib/invoices";
import type { Partner } from "@/lib/finance";
import { cancelInvoice, deleteDraft, eurRate, saveInvoice, type BuyerInput } from "./actions";

type ClientOpt = { id: string; name: string };
type Preset = "even" | "custom" | "none" | string; // string = one partner's id

function Field({ label, children, wide, hint }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[13px] font-medium text-ink3">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink3">{hint}</span>}
    </label>
  );
}

const Section = ({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) => (
  <section className="flex flex-col gap-4 border-t border-line pt-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="display text-[18px] leading-[1.1]">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const emptyBuyer = (clientId: string | null): BuyerInput => ({ id: null, name: "", address: "", pib: "", mb: "", client_id: clientId });

export function InvoiceForm({
  invoice,
  issuers,
  buyers,
  clients,
  partners,
  others,
  shares,
  finance,
  today,
  defaultClientId,
}: {
  invoice: Invoice | null;
  issuers: Issuer[];
  buyers: Buyer[];
  clients: ClientOpt[];
  partners: Partner[];
  /** Everyone else who can be given a share (they appear once added, or when they already have one). */
  others: Partner[];
  shares: Record<string, number>;
  finance: boolean;
  today: string;
  defaultClientId: string | null;
}) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeIssuers = issuers.filter((i) => i.is_active || i.id === invoice?.issuer_id);
  const [issuerId, setIssuerId] = useState(invoice?.issuer_id ?? activeIssuers[0]?.id ?? "");
  const startBuyer = invoice ? buyers.find((b) => b.id === invoice.buyer_id) : null;
  const [buyer, setBuyer] = useState<BuyerInput>(startBuyer ? { ...startBuyer } : emptyBuyer(defaultClientId));
  const [issuedOn, setIssuedOn] = useState(invoice?.issued_on ?? today);
  const [dueDays, setDueDays] = useState(invoice?.due_days ?? 7);
  const [currency, setCurrency] = useState<Currency>(invoice?.currency ?? "RSD");
  const [rate, setRate] = useState<string>(invoice?.eur_rate ? String(invoice.eur_rate) : "");
  const [rateState, setRateState] = useState<"idle" | "loading" | "failed">("idle");
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items.length ? invoice.items : [{ description: DEFAULT_ITEM, quantity: 1, price: 0 }]);
  const [note, setNote] = useState(invoice?.note ?? "");
  const [paidOn, setPaidOn] = useState(invoice?.paid_on ?? "");
  const [pdfUrl, setPdfUrl] = useState(invoice?.pdf_url ?? "");
  const [added, setAdded] = useState<string[]>(others.filter((o) => shares[o.id]).map((o) => o.id));
  const sharers = useMemo(() => [...partners, ...others.filter((o) => added.includes(o.id))], [partners, others, added]);
  const [split, setSplit] = useState<Record<string, string>>(Object.fromEntries([...partners, ...others].map((p) => [p.id, shares[p.id] ? String(shares[p.id]) : ""])));
  const [preset, setPreset] = useState<Preset>("custom");

  const isDraft = !invoice || invoice.status === "draft";
  const cancelled = invoice?.status === "cancelled";
  const number = invoice ? invoiceNumber(invoice) : null;
  const total = totalRsd(items, currency, Number(rate) || null);
  // A preset follows the total as lines change; typing an amount makes it custom.
  const shownSplit = useMemo(() => {
    if (preset === "custom") return split;
    const next = preset === "none" ? {} : presetShares(total, partners.map((p) => p.id), preset);
    return Object.fromEntries(sharers.map((p) => [p.id, next[p.id] ? String(next[p.id]) : ""]));
  }, [preset, split, total, partners, sharers]);
  const shareSum = Object.values(shownSplit).reduce((s, v) => s + (Number(v) || 0), 0);

  // Euro invoices quote the NBS middle rate of the invoice date.
  const loadRate = (date: string) => {
    setRateState("loading");
    start(async () => {
      const r = await eurRate(date);
      if (r) {
        setRate(String(r));
        setRateState("idle");
      } else setRateState("failed");
    });
  };

  const pickBuyer = (id: string) => {
    if (id === "new") return setBuyer(emptyBuyer(buyer.client_id ?? defaultClientId));
    const b = buyers.find((x) => x.id === id);
    if (b) setBuyer({ ...b });
  };
  const setItem = (i: number, patch: Partial<InvoiceItem>) => setItems((list) => list.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const issuer = useMemo(() => issuers.find((i) => i.id === issuerId), [issuers, issuerId]);

  const submit = (issue: boolean) => {
    setError(null);
    start(async () => {
      const res = await saveInvoice({
        id: invoice?.id ?? null,
        issuer_id: issuerId,
        buyer,
        issued_on: issuedOn,
        due_days: dueDays,
        currency,
        eur_rate: currency === "EUR" ? Number(rate) || null : null,
        items,
        note,
        paid_on: paidOn || null,
        pdf_url: pdfUrl,
        shares: finance ? Object.fromEntries(Object.entries(shownSplit).map(([k, v]) => [k, Number(v) || 0])) : null,
        issue,
      });
      if (res.error) return setError(res.error);
      if (!invoice && res.id) router.replace(`/invoices/${res.id}`);
      else router.refresh();
    });
  };

  const managerBuyers = buyers; // RLS already limits a manager to their clients' buyers

  return (
    <div className="flex max-w-[860px] flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <Link href="/invoices" className="text-[14px] font-medium text-ink3 hover:text-ink">‹ {t("title")}</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-[30px] lg:text-[40px]">{number ? t("numbered", { number }) : invoice ? t("draftTitle") : t("newTitle")}</h1>
        {invoice && !isDraft && (
          <Link href={`/print/invoices/${invoice.id}`} target="_blank" className={buttonClass({ size: "sm", variant: "secondary" })}>
            {t("pdf")}
          </Link>
        )}
      </div>
      {cancelled && <p className="rounded-md border border-red-line px-3 py-2 text-[14px] text-red-ink">{t("cancelledNote")}</p>}

      <Section title={t("buyer")}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
          {activeIssuers.length > 1 && (
            <Field label={t("issuer")} wide>
              <select value={issuerId} onChange={(e) => setIssuerId(e.target.value)} disabled={!isDraft} className={`${selectClass} h-[42px]`}>
                {activeIssuers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
          )}
          <Field label={t("pickBuyer")} wide>
            <select value={buyer.id ?? "new"} onChange={(e) => pickBuyer(e.target.value)} className={`${selectClass} h-[42px]`}>
              <option value="new">{t("newBuyer")}</option>
              {managerBuyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label={t("buyerName")} wide>
            <input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("address")} wide>
            <input value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} className={inputClass} />
          </Field>
          <Field label="PIB">
            <input value={buyer.pib} inputMode="numeric" onChange={(e) => setBuyer({ ...buyer, pib: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("mb")}>
            <input value={buyer.mb} inputMode="numeric" onChange={(e) => setBuyer({ ...buyer, mb: e.target.value })} className={inputClass} />
          </Field>
          <Field label={t("appClient")} wide hint={t("appClientHint")}>
            <select value={buyer.client_id ?? ""} onChange={(e) => setBuyer({ ...buyer, client_id: e.target.value || null })} className={`${selectClass} h-[42px]`}>
              {finance && <option value="">{t("noClient")}</option>}
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title={t("details")}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-[18px] sm:grid-cols-4">
          <Field label={t("issuedOn")}>
            <input
              type="date"
              value={issuedOn}
              onChange={(e) => {
                setIssuedOn(e.target.value);
                if (currency === "EUR" && e.target.value) loadRate(e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label={t("dueDays")}>
            <input type="number" min={0} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} className={inputClass} />
          </Field>
          <Field label={t("currency")}>
            <select
              value={currency}
              onChange={(e) => {
                const c = e.target.value as Currency;
                setCurrency(c);
                if (c === "EUR" && !rate) loadRate(issuedOn);
              }}
              className={`${selectClass} h-[42px]`}
            >
              <option value="RSD">RSD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
          {currency === "EUR" && (
            <Field label={t("rate")} hint={rateState === "loading" ? t("rateLoading") : rateState === "failed" ? t("rateFailed") : t("rateHint")}>
              <input value={rate} inputMode="decimal" onChange={(e) => setRate(e.target.value.replace(",", "."))} className={inputClass} />
            </Field>
          )}
        </div>
      </Section>

      <Section
        title={t("items")}
        aside={
          <button type="button" onClick={() => setItems([...items, { description: "", quantity: 1, price: 0 }])} className="cursor-pointer text-[14px] font-semibold text-rust-ink">
            {t("addItem")}
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_64px_120px_24px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_80px_150px_24px]">
              <input aria-label={t("description")} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} className={`${inputClass} min-w-0`} />
              <input aria-label={t("quantity")} type="number" min={0} step="any" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} className={`${inputClass} min-w-0 text-right`} />
              <input
                aria-label={t("price")}
                type="number"
                min={0}
                step="any"
                value={it.price || ""}
                placeholder={currency}
                onChange={(e) => setItem(i, { price: Number(e.target.value) })}
                className={`${inputClass} min-w-0 text-right`}
              />
              <button type="button" aria-label={t("removeItem")} disabled={items.length === 1} onClick={() => setItems(items.filter((_, k) => k !== i))} className="cursor-pointer text-[18px] text-ink3 hover:text-red-ink disabled:invisible">
                ×
              </button>
            </div>
          ))}
          <div className="flex items-baseline justify-end gap-3 pt-1">
            <span className="text-[14px] text-ink3">{t("total")}</span>
            <span className="text-[22px] font-semibold tabular-nums">{money(total)} RSD</span>
          </div>
          <Field label={t("note")} wide>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} className={inputClass} />
          </Field>
        </div>
      </Section>

      {finance && (
        <Section title={t("split")}>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "even", label: t("splitEven") },
              ...partners.map((p) => ({ key: p.id, label: t("splitAll", { name: p.full_name }) })),
              { key: "none", label: t("splitNone") },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setPreset(o.key)}
                className={`h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium ${preset === o.key ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sharers.map((p) => (
              <label key={p.id} className="flex items-center gap-3">
                <Avatar person={p} size={28} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{p.full_name}</span>
                <input
                  value={shownSplit[p.id] ?? ""}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(e) => {
                    setPreset("custom");
                    setSplit({ ...shownSplit, [p.id]: e.target.value.replace(",", ".") });
                  }}
                  className={`${inputClass} w-40 text-right`}
                />
              </label>
            ))}
          </div>
          {others.some((o) => !added.includes(o.id)) && (
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setSplit({ ...shownSplit, [e.target.value]: "" });
                setPreset("custom");
                setAdded([...added, e.target.value]);
              }}
              className={`${selectClass} w-full sm:w-64`}
            >
              <option value="">{t("addPerson")}</option>
              {others
                .filter((o) => !added.includes(o.id))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name}
                  </option>
                ))}
            </select>
          )}
          <p className={`text-[13px] ${Math.abs(shareSum - total) > 0.01 && shareSum > 0 ? "text-rust-ink" : "text-ink3"}`}>
            {shareSum === 0 ? t("splitEmpty") : Math.abs(shareSum - total) > 0.01 ? t("splitOff", { rest: money(total - shareSum) }) : t("splitOk")}
          </p>
        </Section>
      )}

      {!isDraft && (
        <Section title={t("payment")}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-[18px] sm:grid-cols-2">
            <Field label={t("paidOn")}>
              <div className="flex gap-2">
                <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={`${inputClass} min-w-0 flex-1`} />
                <button type="button" onClick={() => setPaidOn(paidOn ? "" : today)} className="h-[42px] cursor-pointer rounded-md border border-line2 px-3 text-[13px] font-medium text-ink2 hover:text-ink">
                  {paidOn ? t("notPaid") : t("today")}
                </button>
              </div>
            </Field>
            <Field label={t("pdfUrl")} hint={t("pdfUrlHint")}>
              <input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://drive.google.com/…" className={inputClass} />
            </Field>
          </div>
        </Section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        {error && <p role="alert" className="mr-auto text-[13px] text-red-ink">{error}</p>}
        {invoice && isDraft && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("deleteDraftConfirm"))) return;
              start(async () => {
                const res = await deleteDraft(invoice.id);
                if (res.error) setError(res.error);
                else router.replace("/invoices");
              });
            }}
            className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
          >
            {t("deleteDraft")}
          </button>
        )}
        {invoice && invoice.status === "issued" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("cancelConfirm", { number: number ?? "" }))) return;
              start(async () => {
                const res = await cancelInvoice(invoice.id);
                if (res.error) setError(res.error);
                else router.refresh();
              });
            }}
            className="mr-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
          >
            {t("cancel")}
          </button>
        )}
        {isDraft ? (
          <>
            <Button variant="secondary" size="sm" disabled={pending || !issuerId} onClick={() => submit(false)}>{t("saveDraft")}</Button>
            <Button
              size="sm"
              disabled={pending || !issuerId}
              onClick={() => {
                if (window.confirm(t("issueConfirm", { issuer: issuer?.name ?? "" }))) submit(true);
              }}
            >
              {t("issue")}
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => submit(false)}>{t("save")}</Button>
        )}
      </div>
      {!issuers.length && <p className="text-[13px] text-red-ink">{t("noIssuer")}</p>}
    </div>
  );
}
