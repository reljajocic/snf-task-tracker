import Link from "next/link";
import { NAV_ICONS } from "@/components/shell/icons";

export type ScheduleShoot = { id: string; date: string; starts_at: string | null; location: string | null };

/** A shoot day in the posting schedule: when and where the footage comes from (opens the shoot day). */
export function ShootMarker({ shoot, label }: { shoot: ScheduleShoot; label: string }) {
  return (
    <Link
      href={`/content/shoots/${shoot.id}`}
      title={[label, shoot.starts_at, shoot.location].filter(Boolean).join(" · ")}
      className="flex min-w-0 items-center gap-1.5 rounded border-l-2 border-accent bg-rust-bg px-[7px] py-[5px] text-[12px] font-semibold leading-tight text-rust-ink hover:brightness-95"
    >
      <span className="flex-none [&_svg]:size-3.5">{NAV_ICONS.shoots}</span>
      <span className="truncate">{[label, shoot.starts_at, shoot.location].filter(Boolean).join(" · ")}</span>
    </Link>
  );
}
