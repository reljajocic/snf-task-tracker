import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Board } from "@/components/board/Board";
import { BoardAccess } from "@/components/board/BoardAccess";
import { requireProfile } from "@/lib/auth";
import { getClientBoard } from "@/lib/boards";
import { getClient } from "@/lib/clients";
import { getInvoiceAccess } from "@/lib/finance";
import { ClientHeader } from "../ClientHeader";

// The client's own moodboard (brand, style, references, links), under its header; the board fills the rest of the screen.
// Made on first open. Only the client's team works on it; it can be shared to the portal like a project's board.
export default async function ClientBoardPage({
  params,
}: PageProps<"/clients/[id]/board">) {
  const [{ id }, me, invoiceAccess, t] = await Promise.all([
    params,
    requireProfile(),
    getInvoiceAccess(),
    getTranslations("board"),
  ]);
  const data = await getClient(id);
  if (!data) notFound();
  const canManage =
    me.role === "admin" ||
    data.members.some((m) => m.profile.id === me.id && m.role === "manager");
  const board = await getClientBoard(id);
  if (!board) notFound();
  return (
    <div className="flex min-h-[calc(100dvh-4.25rem-var(--nav-room))] flex-col lg:h-dvh lg:min-h-0">
      <ClientHeader
        client={data.client}
        active="board"
        canManage={canManage}
        invoices={invoiceAccess.finance || invoiceAccess.clientIds.includes(id)}
      />
      <Board
        boardId={board.id}
        initialElements={board.elements}
        initialFiles={board.files}
        canEdit
        me={{ id: me.id, name: me.full_name }}
        header={
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
            <span className="hidden text-[14px] text-ink2 lg:inline">
              {t("pasteHint")}
            </span>
            <BoardAccess boardId={board.id} value={board.clientAccess} />
          </div>
        }
      />
    </div>
  );
}
