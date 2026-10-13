import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Board } from "@/components/board/Board";
import { BoardAccess } from "@/components/board/BoardAccess";
import { requireProfile } from "@/lib/auth";
import { getProjectBoard } from "@/lib/boards";

// The project's moodboard, full height. Made on first open; the team works on it live.
export default async function ProjectBoardPage({ params }: PageProps<"/clients/[id]/projects/[projectId]/board">) {
  const [{ id, projectId }, me, t] = await Promise.all([params, requireProfile(), getTranslations("board")]);
  const board = await getProjectBoard(projectId);
  if (!board || board.clientId !== id) notFound();
  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-0 flex-col lg:h-dvh">
      <Board
        boardId={board.id}
        initialElements={board.elements}
        initialFiles={board.files}
        canEdit
        me={{ id: me.id, name: me.full_name }}
        header={
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/clients/${id}`} className="text-[14px] font-medium text-ink3 hover:text-ink">
              ← {board.clientName}
            </Link>
            <span className="truncate text-[16px] font-semibold">
              {t("title")} · {board.projectName}
            </span>
            <BoardAccess boardId={board.id} value={board.clientAccess} />
          </div>
        }
      />
    </div>
  );
}
