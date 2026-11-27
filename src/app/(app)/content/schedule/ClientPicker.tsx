"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The client switcher, first in the filter row (bold, but not in the accent colour: the page's main action keeps that). `allLabel` adds an "all clients" option (value "all"). */
export function ClientPicker({ clients, value, allLabel }: { clients: { id: string; name: string }[]; value: string; allLabel?: string }) {
  const t = useTranslations("schedule");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      value={value}
      onChange={(e) => {
        // Remembered for the other content pages (shoots / schedule / video bank).
        if (e.target.value !== "all") document.cookie = `snf-client=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
        const next = new URLSearchParams(params);
        next.set("client", e.target.value);
        router.push(`${pathname}?${next}`);
      }}
      aria-label={t("client")}
      className="h-9 max-w-[260px] flex-none cursor-pointer appearance-none truncate rounded-full border border-line2 bg-transparent bg-[url(/brand/chevron.svg)] bg-[length:9px] bg-[right_14px_center] bg-no-repeat pl-3.5 pr-9 text-[13px] font-semibold text-ink outline-none hover:border-ink3"
    >
      {allLabel && <option value="all">{allLabel}</option>}
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
