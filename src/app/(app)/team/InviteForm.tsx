"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AVATAR_COLORS } from "@/lib/team";
import { inviteMember, type InviteState } from "./actions";

const field =
  "h-11 rounded-md border border-line2 bg-chip px-3 text-[15px] text-ink outline-none focus:border-accent";

export function InviteForm() {
  const t = useTranslations("team");
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, null);
  const [color, setColor] = useState(0);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-line bg-surf p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="display text-[20px]">{t("invite")}</h2>
        <p className="text-[14px] text-ink2">{t("inviteLead")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">{t("name")}</span>
          <input name="full_name" required className={field} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">{t("email")}</span>
          <input name="email" type="email" required className={field} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">{t("initials")}</span>
          <input name="initials" maxLength={2} className={`${field} uppercase`} />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="eyebrow mb-2">{t("color")}</legend>
          <input type="hidden" name="color" value={color} />
          <div className="flex gap-2">
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={c.bg}
                type="button"
                aria-label={c.bg}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
                className={`size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-[var(--surf)] ${color === i ? "ring-2 ring-accent" : ""}`}
                style={{ background: c.bg }}
              />
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">{t("role")}</span>
          <select name="role" defaultValue="user" className={field}>
            <option value="user">{t("roleUser")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
        </label>
        <Button type="submit" size="sm" disabled={pending} className="ml-auto h-11">
          {t("sendInvite")}
        </Button>
      </div>

      {state && (
        <p role="status" className={`text-[14px] ${state.ok ? "text-[var(--status-done)]" : "text-red-ink"}`}>
          {state.ok ? t("invited", { email: state.email ?? "" }) : t("inviteFailed", { message: state.message })}
        </p>
      )}
    </form>
  );
}
