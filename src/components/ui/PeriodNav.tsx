import Link from "next/link";

/** "‹ October 2026 ›": the one way to step through months (or weeks, days) everywhere in the app and the portal. */
export function PeriodNav({
  label,
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
  fill = false,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  prevLabel?: string;
  nextLabel?: string;
  /** Takes the room left in its row (phones, next to another control), the label between the arrows. */
  fill?: boolean;
}) {
  const arrow = "flex h-full items-center justify-center px-3 text-ink3 max-lg:min-w-11 hover:text-ink";
  return (
    <div className={`flex h-[42px] items-center ${fill ? "min-w-0 flex-1" : ""} whitespace-nowrap rounded-md border border-line2 text-[14px] font-medium`}>
      <Link href={prevHref} scroll={false} aria-label={prevLabel} className={arrow}>‹</Link>
      <span className={fill ? "min-w-0 flex-1 truncate text-center" : "min-w-[130px] text-center"}>{label}</span>
      <Link href={nextHref} scroll={false} aria-label={nextLabel} className={arrow}>›</Link>
    </div>
  );
}
