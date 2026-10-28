// Video-specific visuals: the format tag (video / photo / carousel, with the content type) and the
// 5-segment phase bar (design 4a).
import { useTranslations } from "next-intl";
import type { PostFormat } from "@/lib/formats";
import { PHASES, phaseInfo, type Task } from "@/lib/tasks";
import { PostTags } from "./tags";

export function VideoTag({ format, contentType }: { format: PostFormat; contentType?: string | null }) {
  const t = useTranslations("format");
  return <PostTags format={format} type={contentType ?? null} formatLabel={t(format)} />;
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
