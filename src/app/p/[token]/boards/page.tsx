import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPortalBoards } from "@/lib/boards";
import { getPortal } from "@/lib/portal";

// The client's moodboards (only the ones the team shared).
export default async function PortalBoards({ params }: PageProps<"/p/[token]/boards">) {
  const { token } = await params;
  const portal = (await getPortal(token))!;
  const t = await getTranslations({ locale: portal.locale, namespace: "board" });
  const boards = await getPortalBoards(portal.clientId);
  if (!boards.length) notFound();
  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-5 pt-8 lg:pt-10">
      <h1 className="display text-[32px] lg:text-[44px]">{t("portalTitle")}</h1>
      <div className="snf-stack">
        {boards.map((b) => (
          <Link key={b.id} href={`/p/${token}/boards/${b.id}`} className="flex items-center justify-between gap-4 bg-surf px-[18px] py-4 hover:bg-hover">
            <span className="text-[16px] font-medium">{b.projectName}</span>
            <span className="text-[14px] text-ink2">{t(b.access === "edit" ? "canEdit" : "canView")} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
