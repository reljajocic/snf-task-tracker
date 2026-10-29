import Link from "next/link";

/** "‹ October 2026 ›": the one way to step through months (or weeks, days) everywhere in the app and the portal. */
export function PeriodNav({ label, prevHref, nextHref, prevLabel, nextLabel }: { label: string; prevHref: string; nextHref: string; prevLabel?: string; nextLabel?: string }) {
  const arrow = "flex h-full items-center px-3 text-ink3 hover:text-ink";
  return (
    <div className="flex h-[42px] items-center whitespace-nowrap rounded-[7px] border border-line2 text-[14px] font-medium">
      <Link href={prevHref} scroll={false} aria-label={prevLabel} className={arrow}>‹</Link>
      <span className="min-w-[130px] text-center">{label}</span>
      <Link href={nextHref} scroll={false} aria-label={nextLabel} className={arrow}>›</Link>
    </div>
  );
}
