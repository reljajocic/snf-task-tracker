"use client";

import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/locale";

/** SR / EN for whoever is reading the portal (remembered on this device). */
export function PortalLang({ current }: { current: Locale }) {
  const router = useRouter();
  return (
    <div className="flex flex-none items-center rounded-full border border-line2 p-[3px] text-[12px] font-semibold uppercase tracking-[0.08em]">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={current === l}
          onClick={() => {
            document.cookie = `snf-portal-lang=${l}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
          className={`h-7 cursor-pointer rounded-full px-2.5 ${current === l ? "bg-seg text-seg-ink" : "text-ink3 hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
