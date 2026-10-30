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
  phone = "full",
}: {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  newTask?: boolean;
  border?: boolean;
  /**
   * Phones: "full" header, only its "actions" (no title or eyebrow), or "none" at all, where the screen's own
   * tabs and the bottom bar already say where you are.
   */
  phone?: "full" | "actions" | "none";
}) {
  return (
    <header
      className={`flex flex-col px-5 lg:flex-row ${phone === "full" ? "gap-4 pb-5 pt-6" : phone === "actions" ? "gap-0 pb-4 pt-4" : "max-lg:hidden"} lg:items-end lg:justify-between lg:gap-6 lg:px-10 lg:pb-6 lg:pt-9 ${
        border ? "border-line lg:border-b" : ""
      }`}
    >
      <div className={`flex min-w-0 flex-col gap-2.5 ${phone === "full" ? "" : "max-lg:sr-only"}`}>
        {eyebrow && (
          <span className="whitespace-nowrap text-[14px] font-medium leading-none text-ink2">
            {eyebrow}
          </span>
        )}
        <h1 className="display text-[28px] lg:whitespace-nowrap lg:text-[44px]">{title}</h1>
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
