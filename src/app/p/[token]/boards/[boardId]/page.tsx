import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Board } from "@/components/board/Board";
import { getPortalBoard } from "@/lib/boards";
import { getPortal } from "@/lib/portal";

// A shared moodboard in the portal: view, or edit when the team allows it.
export default async function PortalBoard({ params }: PageProps<"/p/[token]/boards/[boardId]">) {
  const { token, boardId } = await params;
  const portal = (await getPortal(token))!;
  const t = await getTranslations({ locale: portal.locale, namespace: "board" });
  const board = await getPortalBoard(portal.clientId, boardId);
  if (!board) notFound();
  return (
    <div className="flex h-[calc(100dvh-4rem-var(--nav-room))] min-h-0 flex-col lg:h-[calc(100dvh-72px)]">
      <Board
        boardId={board.id}
        token={token}
        initialElements={board.elements}
        initialFiles={board.files}
        canEdit={board.clientAccess === "edit"}
        header={
          <div className="flex min-w-0 items-center gap-4">
            <Link href={`/p/${token}/boards`} className="text-[14px] font-medium text-ink3 hover:text-ink">
              ←
            </Link>
            <span className="flex min-w-0 items-baseline gap-2.5 truncate text-[16px] font-semibold">
              {t("title")}
              <span className="truncate font-medium text-ink2">{board.projectName ?? t("general")}</span>
            </span>
          </div>
        }
      />
    </div>
  );
}
