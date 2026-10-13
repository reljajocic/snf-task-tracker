"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setBoardAccess } from "@/app/actions/boards";
import type { BoardAccess as Access } from "@/lib/boards";

/** Whether the client sees this board in their portal, and whether they can change it. */
export function BoardAccess({ boardId, value }: { boardId: string; value: Access }) {
  const t = useTranslations("board.access");
  const [access, setAccess] = useState<Access>(value);
  const [, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink2">
      {t("label")}
      <select
        value={access}
        onChange={(e) => {
          const next = e.target.value as Access;
          const prev = access;
          setAccess(next);
          start(async () => {
            const res = await setBoardAccess(boardId, next);
            if (res.error) setAccess(prev);
          });
        }}
        className="h-8 cursor-pointer rounded-md border border-line2 bg-transparent px-2 text-[13px] text-ink outline-none"
      >
        {(["none", "view", "edit"] as const).map((k) => (
          <option key={k} value={k}>
            {t(k)}
          </option>
        ))}
      </select>
    </label>
  );
}
