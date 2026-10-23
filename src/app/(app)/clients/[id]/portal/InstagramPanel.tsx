"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { ask } from "@/components/ui/Dialog";
import { disconnectInstagram, syncInstagramNow } from "./instagram-actions";

type Account = { username: string | null; synced_at: string | null; sync_error: string | null } | null;

/** The client's Instagram: connect it (log in as the client), refresh the numbers now, or disconnect. */
export function InstagramPanel({ clientId, account, status }: { clientId: string; account: Account; status: string | null }) {
  const t = useTranslations("instagram");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(
    status === "connected" ? { ok: true, text: t("connected") } : status && status !== "connected" ? { ok: false, text: t(`status.${status}`) } : null,
  );
  const connect = `/api/instagram/connect?client=${clientId}`;

  return (
    <section className="flex flex-col gap-3.5 rounded-lg border border-line bg-surf p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-[18px] leading-[1.1]">Instagram</h2>
        {account && <span className="text-[14px] font-medium">@{account.username}</span>}
      </div>
      <p className="text-[14px] text-ink2">{account ? t("connectedLead") : t("lead")}</p>
      {account?.sync_error && <p className="text-[13px] text-red-ink">{t("lastError", { message: account.sync_error })}</p>}
      {account?.synced_at && !account.sync_error && (
        <p className="text-[13px] text-ink3">{t("syncedAt", { when: `${account.synced_at.slice(8, 10)}.${account.synced_at.slice(5, 7)}. ${account.synced_at.slice(11, 16)}` })}</p>
      )}
      {note && <p className={`text-[13px] ${note.ok ? "text-[var(--status-done)]" : "text-red-ink"}`}>{note.text}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {account ? (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await syncInstagramNow(clientId);
                  setNote(res.error ? { ok: false, text: res.error } : { ok: true, text: t("synced", { n: res.posts ?? 0 }) });
                  router.refresh();
                })
              }
            >
              {pending ? t("syncing") : t("sync")}
            </Button>
            <a href={connect} className={buttonClass({ size: "sm", variant: "secondary" })}>{t("reconnect")}</a>
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                if (!(await ask({ title: t("disconnectConfirm", { name: account.username ?? "" }), body: t("disconnectBody"), confirm: t("disconnect"), danger: true }))) return;
                start(async () => {
                  await disconnectInstagram(clientId);
                  setNote(null);
                  router.refresh();
                });
              }}
              className="ml-auto h-10 cursor-pointer px-2 text-[13px] font-medium text-red-ink"
            >
              {t("disconnect")}
            </button>
          </>
        ) : (
          <a href={connect} className={buttonClass({ size: "sm" })}>{t("connect")}</a>
        )}
      </div>
    </section>
  );
}
