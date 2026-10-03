"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Accented client switcher, first in the filter row (each client has its own schedule). */
export function ClientPicker({ clients, value }: { clients: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        next.set("client", e.target.value);
        router.push(`${pathname}?${next}`);
      }}
      aria-label="Client"
      className="h-9 max-w-[260px] cursor-pointer appearance-none truncate rounded-full border border-accent bg-rust-bg bg-[url(/brand/chevron.svg)] bg-[length:9px] bg-[right_14px_center] bg-no-repeat pl-3.5 pr-9 text-[13px] font-semibold text-ink outline-none"
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
