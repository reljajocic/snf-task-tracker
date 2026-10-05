import Link from "next/link";
import { NAV_ICONS } from "@/components/shell/icons";
import { AvatarStack } from "@/components/ui/Avatar";
import type { ShootDay } from "@/lib/content";

/** A shoot day among the tasks (home, calendar): it's work too, so it shows where the work shows. */
export function ShootEvent({ shoot, label, variant = "card" }: { shoot: ShootDay; label: string; variant?: "card" | "chip" }) {
  const time = shoot.starts_at ? `${shoot.starts_at}${shoot.ends_at ? `–${shoot.ends_at}` : ""}` : null;
  if (variant === "chip") {
    return (
      <Link
        href={`/content/shoots/${shoot.id}`}
        className="flex min-w-0 items-center gap-1.5 rounded border-l-2 border-accent bg-rust-bg px-[7px] py-[5px] text-[12px] font-semibold leading-tight text-rust-ink"
      >
        <span className="flex-none [&_svg]:size-3.5">{NAV_ICONS.shoots}</span>
        <span className="truncate">{[time, shoot.client?.name].filter(Boolean).join(" ")}</span>
      </Link>
    );
  }
  return (
    <Link
      href={`/content/shoots/${shoot.id}`}
      className="flex items-center gap-3.5 rounded-lg border border-line border-l-[3px] border-l-accent bg-surf px-4 py-3 hover:bg-chip"
    >
      <span className="grid size-9 flex-none place-items-center rounded-full bg-rust-bg text-rust-ink">{NAV_ICONS.shoots}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-medium">
          {label} · {shoot.client?.name}
        </span>
        <span className="truncate text-[13px] text-ink3">
          {[shoot.location, time, `${shoot.shot}/${shoot.total}`].filter(Boolean).join(" · ")}
        </span>
      </span>
      <AvatarStack people={shoot.crew} size={24} />
    </Link>
  );
}
