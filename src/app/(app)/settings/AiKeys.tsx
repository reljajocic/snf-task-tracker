"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/tasks/fields";
import { formatDate } from "@/lib/dates";
import { createApiToken, deleteApiToken } from "./actions";

export type ApiKey = { id: string; name: string; created_at: string; last_used_at: string | null };

/** Personal keys for AI assistants (MCP): make one, copy its link once, delete it to cut access. */
export function AiKeys({ keys }: { keys: ApiKey[] }) {
  const t = useTranslations("settings.ai");
  const router = useRouter();
  const [name, setName] = useState("Claude");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const res = await createApiToken(name);
      if ("error" in res) setError(res.error);
      else {
        setError(null);
        setUrl(res.url);
        setCopied(false);
        router.refresh();
      }
    });
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surf p-6">
      {url ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-[14px] font-semibold">{t("created")}</span>
          <div className="flex flex-wrap gap-2">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className={`${inputClass} min-w-0 flex-1 font-mono text-[13px]`} />
            <Button type="button" size="sm" onClick={copy}>
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <span className="text-[13px] text-ink3">{t("onceHint")}</span>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px] text-ink2">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[200px] flex-1 flex-col gap-2">
            <span className="eyebrow">{t("keyName")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
          </label>
          <Button type="button" size="sm" disabled={pending} onClick={create}>
            {t("create")}
          </Button>
        </div>
      )}
      {error && <span className="text-[13px] text-red-ink">{error}</span>}

      {keys.length > 0 && (
        <div className="flex flex-col divide-y divide-line border-t border-line">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 py-3 text-[14px]">
              <span className="min-w-0 flex-1 truncate font-medium">{k.name}</span>
              <span className="text-[13px] text-ink3">
                {k.last_used_at ? t("lastUsed", { date: formatDate(k.last_used_at.slice(0, 10)) }) : t("neverUsed")}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => {
                  await deleteApiToken(k.id);
                  router.refresh();
                })}
                className="cursor-pointer text-[13px] font-medium text-red-ink hover:underline"
              >
                {t("delete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
