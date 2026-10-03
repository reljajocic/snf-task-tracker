import { useTranslations } from "next-intl";
import { PORTAL_STATUS_COLOR, type PortalStatus } from "@/lib/portal";

export function PortalStatusLabel({ status }: { status: PortalStatus }) {
  const t = useTranslations("portal.status");
  return (
    <span className={`flex items-center gap-2 whitespace-nowrap text-[13px] font-medium ${status === "awaiting" ? "text-rust-ink" : "text-ink2"}`}>
      <span className="size-2 flex-none rounded-full" style={{ background: PORTAL_STATUS_COLOR[status] }} />
      {t(status)}
    </span>
  );
}

export function TypeTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="justify-self-start whitespace-nowrap rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em] text-ink2">
      {children}
    </span>
  );
}

/** Vertical 9:16 poster placeholder with a play glyph (design 7a). */
export function Poster({ className = "" }: { className?: string }) {
  return (
    <div className={`grid flex-none place-items-center rounded-[5px] border border-line bg-[linear-gradient(160deg,#3B3839,#1C1A1B)] text-[18px] text-offwhite ${className}`}>
      ▶
    </div>
  );
}
