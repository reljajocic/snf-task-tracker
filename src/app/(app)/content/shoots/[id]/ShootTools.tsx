"use client";

import { useTranslations } from "next-intl";

/** Call sheet for the day, generated from the shoot table: who comes at what time. */
export function CallTimes({ times }: { times: { time: string; name: string }[] }) {
  const t = useTranslations("shoots");
  if (!times.length) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surf p-4">
      <div className="flex items-baseline gap-2">
        <span className="display text-[15px] leading-none">{t("callTimes")}</span>
        <span className="text-[12.5px] text-ink3">{t("callTimesAuto")}</span>
      </div>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
        {times.map((r) => (
          <div key={r.time} className="grid grid-cols-[60px_minmax(0,1fr)] gap-3 border-t border-line py-2">
            <span className="display text-[15px] leading-6">{r.time}</span>
            <span className="text-[15px] leading-6">{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
