import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { NewTaskButton } from "@/components/tasks/links";

/** Screen header: eyebrow + display title; controls and "+ New task" on the right (desktop). */
export async function PageHeader({
  title,
  eyebrow,
  actions,
  newTask = true,
  border = false,
}: {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  newTask?: boolean;
  border?: boolean;
}) {
  return (
    <header
      className={`flex flex-col gap-4 px-5 pb-5 pt-8 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:px-10 lg:pb-6 lg:pt-9 ${
        border ? "border-b border-line" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2.5">
        {eyebrow && (
          <span className="whitespace-nowrap text-[12px] font-medium uppercase leading-none tracking-[0.14em] text-ink3 lg:text-[13px]">
            {eyebrow}
          </span>
        )}
        <h1 className="display text-[32px] lg:whitespace-nowrap lg:text-[44px]">{title}</h1>
      </div>
      {(actions || newTask) && (
        <div className="flex flex-wrap items-center gap-3 lg:flex-none lg:flex-nowrap lg:gap-4">
          {actions}
          {newTask && (
            <span className="hidden lg:flex">
              <Suspense>
                <NewTaskButton />
              </Suspense>
            </span>
          )}
        </div>
      )}
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
