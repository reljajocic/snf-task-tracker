// Video-specific visuals: the VIDEO tag and the 5-segment phase bar (design 4a).
import { useTranslations } from "next-intl";
import { PHASES, phaseInfo, type Task } from "@/lib/tasks";

export function VideoTag({ contentType, size = "sm" }: { contentType?: string | null; size?: "sm" | "md" }) {
  const t = useTranslations("video");
  return (
    <span
      className={`flex flex-none items-center gap-[5px] whitespace-nowrap rounded-[3px] border border-line2 font-semibold uppercase leading-none tracking-[0.1em] text-ink ${
        size === "md" ? "px-2 py-[5px] text-[10.5px]" : "px-1.5 py-1 text-[10.5px]"
      }`}
    >
      <span className="size-1.5 rounded-[1px] bg-accent" />
      {t("tag")}
      {contentType ? ` · ${contentType}` : ""}
    </span>
  );
}

export function PhaseBar({ task }: { task: Pick<Task, "phase" | "subtask_count"> }) {
  const t = useTranslations();
  const { index, published, step } = phaseInfo(task.phase);
  const p = task.phase ?? 0;
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="grid grid-cols-5 gap-[3px]">
        {PHASES.map((_, i) => (
          <span
            key={i}
            className="h-1 rounded-[2px]"
            style={{ background: published || i < p ? "var(--ink2)" : i === p ? "var(--accent)" : "var(--line2)" }}
          />
        ))}
      </div>
      <div className="flex justify-between gap-2 whitespace-nowrap text-[12px] font-medium leading-tight text-ink2">
        <span>{published ? t("phase.published") : t("phase.step", { phase: t(`phase.${PHASES[index]}`), n: step })}</span>
        {task.subtask_count > 0 && (
          <span className="truncate text-ink3">{t("video.subtasksCount", { count: task.subtask_count })}</span>
        )}
      </div>
    </div>
  );
}
