import Link from "next/link";
import type { ComponentProps } from "react";

// Port of the design system's <Button>: uppercase DM Sans 500, tracked label,
// 10px radius, rust gradient primary with a big soft glow that brightens on hover. No scale on press.
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-md border font-medium uppercase tracking-[0.14em] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent border-transparent text-charcoal hover:brightness-110 active:brightness-95",
  secondary:
    "bg-transparent border-[var(--btn-secondary-line)] text-ink hover:border-ink",
  ghost: "bg-transparent border-transparent text-ink2 hover:text-ink px-1",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-[1.1rem] text-[13px]",
  md: "h-12 px-7 text-[15px]",
  lg: "h-[52px] px-9 text-[17px]",
};

type Common = { variant?: Variant; size?: Size; className?: string };

export function buttonClass({ variant = "primary", size = "md", className }: Common = {}) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: Common & ComponentProps<"button">) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
