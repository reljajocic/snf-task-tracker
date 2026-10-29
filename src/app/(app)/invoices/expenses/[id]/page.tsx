import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/Button";
import { getLookups } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { embedUrl } from "@/lib/embed";
import { getExpense, getInvoiceAccess, getPartners, getSubscriptions } from "@/lib/finance";
import { money } from "@/lib/invoices";
import { safeHref } from "@/lib/safe-url";
import { PageTitle } from "@/components/shell/PageTitle";

// One cost to look at: the facts, and the supplier's PDF right on the page when it's a Drive file.
export default async function ExpenseView({ params }: PageProps<"/invoices/expenses/[id]">) {
  const [{ id }, access] = await Promise.all([params, getInvoiceAccess()]);
  if (!access.finance) redirect("/invoices");
  const [expense, t, lookups, partners, subscriptions] = await Promise.all([getExpense(id), getTranslations("invoices"), getLookups(), getPartners(), getSubscriptions()]);
  if (!expense) notFound();
  const client = lookups.clients.find((c) => c.id === expense.client_id);
  const payer = partners.find((p) => p.id === expense.profile_id);
  const subscription = subscriptions.find((s) => s.id === expense.subscription_id);
  const doc = safeHref(expense.doc_url);
  const preview = doc ? embedUrl(doc) : null;

  const fact = (label: string, value: React.ReactNode) =>
    value ? (
      <div className="flex justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
        <span className="text-[14px] text-ink3">{label}</span>
        <span className="text-right text-[14px] font-medium">{value}</span>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-12 lg:pt-9">
      <PageTitle
        back={{ href: "/invoices/expenses", label: t("expensesTitle") }}
        title={expense.description}
        sub={<span className="text-[22px] font-semibold tabular-nums">{money(expense.amount)} RSD</span>}
        actions={<Link href={`/invoices/expenses/${expense.id}/edit`} className={buttonClass({ size: "sm" })}>{t("edit")}</Link>}
      />

      <div className={`grid grid-cols-1 items-start gap-6 ${preview ? "xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]" : ""}`}>
        {preview && (
          <iframe src={preview} title={expense.description} className="h-[75vh] w-full rounded-lg border border-line bg-surf" allow="autoplay" />
        )}
        <section className="max-w-[560px] rounded-lg border border-line bg-surf px-5 py-3 xl:max-w-none">
          {fact(t("spentOn"), formatDate(expense.spent_on))}
          {fact(t("supplier"), expense.supplier)}
          {fact(t("receivedNo"), expense.invoice_no)}
          {expense.invoice_no &&
            fact(t("paidOn"), expense.paid_on ? formatDate(expense.paid_on) : <span className="text-red-ink">{t("receivedUnpaid")}</span>)}
          {fact(t("forClient"), client?.name)}
          {fact(t("paidBy"), payer ? t("onlyFor", { name: payer.full_name }) : t("splitBetween"))}
          {fact(t("fromSubscription"), subscription && <Link href={`/invoices/expenses/subscriptions/${subscription.id}`} className="hover:underline">{subscription.name}</Link>)}
          {fact(
            t("docUrl"),
            doc && (
              <a href={doc} target="_blank" rel="noreferrer" className="text-rust-ink hover:underline">
                {t("open")} ↗
              </a>
            ),
          )}
        </section>
      </div>
    </div>
  );
}
