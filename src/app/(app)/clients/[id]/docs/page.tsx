import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { getLookups } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { docSnippet } from "@/lib/doc-text";
import { getInvoiceAccess } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { ClientHeader } from "../ClientHeader";
import { DocPage, type ClientDoc } from "./DocPage";
import { NewDoc } from "./NewDoc";

const STARTERS = ["brand", "likes", "contacts", "links"] as const;

// The team's notes on a client: short pages (brand and tone, what they like, contacts, links). URL: ?d=<page>&edit=1
// Phones show the list, or one page with a way back; wider screens show both side by side.
export default async function ClientDocsPage({ params, searchParams }: PageProps<"/clients/[id]/docs">) {
  const [{ id }, { d, edit }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [lookups, data, me, invoiceAccess, t, { data: rows }] = await Promise.all([
    getLookups(),
    getClient(id),
    requireProfile(),
    getInvoiceAccess(),
    getTranslations("docs"),
    supabase.from("client_docs").select("id, title, body, updated_at, updated_by").eq("client_id", id).order("position").order("created_at"),
  ]);
  const client = lookups.clients.find((c) => c.id === id);
  if (!client || !data) notFound();
  const docs = (rows ?? []) as ClientDoc[];
  const canEdit = client.isTeam;
  const picked = typeof d === "string" ? docs.find((x) => x.id === d) : undefined;
  const open = picked ?? docs[0];
  const base = `/clients/${id}/docs`;
  const name = (uid: string | null) => (uid && uid !== me.id ? lookups.people.find((p) => p.id === uid)?.full_name ?? null : uid === me.id ? t("you") : null);

  return (
    <div className="flex flex-col">
      <ClientHeader client={data.client} active="docs" canManage={me.role === "admin" || client.canManage} invoices={invoiceAccess.finance || invoiceAccess.clientIds.includes(id)} />
      {!docs.length ? (
        <div className="flex max-w-[720px] flex-col gap-5 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-7 lg:px-10 lg:pb-12">
          <div className="flex flex-col gap-2">
            <h2 className="display text-[22px] leading-[1.1]">{t("emptyTitle")}</h2>
            <p className="max-w-[560px] text-[14px] leading-relaxed text-ink2">{t("emptyLead")}</p>
          </div>
          {canEdit ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <NewDoc
                  key={s}
                  clientId={id}
                  title={t(`starter.${s}.title`)}
                  body={t(`starter.${s}.body`)}
                  className="flex cursor-pointer flex-col items-start gap-1 rounded-lg border border-line bg-surf px-4 py-3.5 text-left transition-colors hover:border-ink3 disabled:opacity-45"
                  label={
                    <>
                      <span className="text-[15px] font-semibold">{t(`starter.${s}.title`)}</span>
                      <span className="text-[13px] leading-snug text-ink3">{t(`starter.${s}.hint`)}</span>
                    </>
                  }
                />
              ))}
              <NewDoc clientId={id} title={t("untitled")} className="h-11 cursor-pointer self-start text-left text-[14px] font-medium text-rust-ink hover:underline disabled:opacity-45" label={t("blank")} />
            </div>
          ) : (
            <p className="text-[14px] text-ink3">{t("noneYet")}</p>
          )}
          <p className="text-[13px] leading-snug text-ink3">{t("privateHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:px-10 lg:pb-12 lg:pt-7">
          <nav aria-label={t("title")} className={`flex-col gap-1 lg:sticky lg:top-6 ${picked ? "hidden lg:flex" : "flex"}`}>
            {docs.map((x) => {
              const active = x.id === open.id;
              return (
                <Link
                  key={x.id}
                  href={`${base}?d=${x.id}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col gap-0.5 rounded-md border px-3.5 py-3 transition-colors lg:py-2.5 ${active ? "border-line2 bg-surf" : "border-transparent hover:bg-surf"} max-lg:border-line max-lg:bg-surf`}
                >
                  <span className="truncate text-[15px] font-semibold lg:text-[14px]">{x.title}</span>
                  {docSnippet(x.body) && <span className="truncate text-[13px] text-ink3">{docSnippet(x.body, 60)}</span>}
                </Link>
              );
            })}
            {canEdit && <NewDoc clientId={id} title={t("untitled")} className="mt-2 h-10 cursor-pointer self-start px-3.5 text-left text-[14px] font-medium text-rust-ink hover:underline disabled:opacity-45" label={`+ ${t("newPage")}`} />}
            <p className="mt-3 px-3.5 text-[12px] leading-snug text-ink3">{t("privateHint")}</p>
          </nav>
          <div className={`min-w-0 flex-col gap-4 ${picked ? "flex" : "hidden lg:flex"}`}>
            <Link href={base} className="text-[14px] font-medium text-ink2 lg:hidden">
              ← {t("allPages")}
            </Link>
            <DocPage
              key={open.id}
              clientId={id}
              doc={open}
              canEdit={canEdit}
              editedBy={name(open.updated_by)}
              editedOn={formatDate(open.updated_at.slice(0, 10))}
              startEditing={edit === "1" && !!picked}
            />
          </div>
        </div>
      )}
    </div>
  );
}
