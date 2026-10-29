import Link from "next/link";
import type { ReactNode } from "react";

/** "‹ Where you came from": the one back link (lists, client, invoice…). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="self-start text-[14px] font-medium text-ink3 hover:text-ink">
      ‹ {label}
    </Link>
  );
}

/**
 * The one page title: back link, eyebrow, title (and a line under it), actions on the right on desktop.
 * PageHeader wraps it with the page padding; forms and detail pages use it inside their own column.
 */
export function PageTitle({
  title,
  back,
  eyebrow,
  sub,
  actions,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div className="flex min-w-0 flex-col gap-2.5">
        {back && <BackLink {...back} />}
        {eyebrow && <span className="text-[14px] font-medium leading-snug text-ink2">{eyebrow}</span>}
        <h1 className="display text-[28px] leading-[1] lg:text-[44px]">{title}</h1>
        {sub}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 lg:flex-none lg:flex-nowrap">{actions}</div>}
    </div>
  );
}
