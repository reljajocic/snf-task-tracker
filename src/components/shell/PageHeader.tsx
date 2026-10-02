import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** Screen header: eyebrow + display title, "+ New task" on the right (desktop). */
export async function PageHeader({
  title,
  eyebrow,
  actions,
  newTask = true,
}: {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  newTask?: boolean;
}) {
  const t = await getTranslations("common");
  return (
    <header className="flex items-end justify-between gap-6 px-5 pb-5 pt-8 lg:px-10 lg:pt-9">
      <div className="flex min-w-0 flex-col gap-2.5">
        {eyebrow && (
          <span className="text-[12px] font-medium uppercase leading-none tracking-[0.14em] text-ink3 lg:text-[13px]">
            {eyebrow}
          </span>
        )}
        <h1 className="display text-[32px] lg:whitespace-nowrap lg:text-[44px]">{title}</h1>
      </div>
      <div className="hidden flex-none items-center gap-3 lg:flex">
        {actions}
        {newTask && <Button size="sm">{t("newTask")}</Button>}
      </div>
    </header>
  );
}

export async function ComingNext() {
  const t = await getTranslations("common");
  return (
    <div className="mx-5 rounded-lg border border-dashed border-line2 px-6 py-16 text-center text-[15px] text-ink3 lg:mx-10">
      {t("comingNext")}
    </div>
  );
}
