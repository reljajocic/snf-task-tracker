"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** "NoLimit Gym ▾" above the page title (design 2a). */
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
      className="cursor-pointer appearance-none border-0 bg-transparent bg-[url(/brand/chevron.svg)] bg-[length:9px] bg-[right_0_center] bg-no-repeat pr-4 text-[14px] font-medium normal-case tracking-normal text-ink2 outline-none"
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
