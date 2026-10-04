"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/tasks/fields";
import type { Profile } from "@/lib/auth";
import { NOTIFICATION_EVENTS, isEnabled, type NotificationEvent, type Preference } from "@/lib/notifications";
import { LOCALES, LOCALE_NAME, type Locale } from "@/lib/locale";
import { AVATAR_COLORS } from "@/lib/team";
import { saveProfile, setLanguage, setPreference } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState(saveProfile, null);
  const initialColor = Math.max(0, AVATAR_COLORS.findIndex((c) => c.bg.toLowerCase() === profile.avatar_bg.toLowerCase()));
  const [color, setColor] = useState(initialColor);
  const [name, setName] = useState(profile.full_name);
  const [initials, setInitials] = useState(profile.initials);
  const preview = { ...profile, full_name: name, initials: initials || name.charAt(0).toUpperCase(), avatar_bg: AVATAR_COLORS[color].bg, avatar_fg: AVATAR_COLORS[color].fg };

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-line bg-surf p-6">
      <div className="flex items-center gap-3">
        <Avatar person={preview} size={40} />
        <span className="text-[13px] text-ink3">{profile.email}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">{t("name")}</span>
          <input name="full_name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">{t("initials")}</span>
          <input name="initials" maxLength={2} value={initials} onChange={(e) => setInitials(e.target.value)} className={`${inputClass} uppercase`} />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow mb-2">{t("color")}</legend>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c, i) => (
            <button key={c.bg} type="button" aria-label={c.bg} aria-pressed={color === i} onClick={() => setColor(i)}
              className={`size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-[var(--surf)] ${color === i ? "ring-2 ring-accent" : ""}`} style={{ background: c.bg }} />
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-end gap-3">
        {state?.ok && <span className="text-[13px] text-[var(--status-done)]">{t("saved")}</span>}
        {state?.error && <span className="text-[13px] text-red-ink">{state.error}</span>}
        <Button type="submit" size="sm" disabled={pending}>{t("saveProfile")}</Button>
      </div>
    </form>
  );
}

export function LanguageSetting({ current }: { current: Locale }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={value === l}
          onClick={() => {
            setValue(l);
            start(async () => {
              await setLanguage(l);
              router.refresh();
            });
          }}
          className={`h-11 cursor-pointer rounded-full border px-5 text-[14px] font-medium ${value === l ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`}
        >
          {LOCALE_NAME[l]}
        </button>
      ))}
    </div>
  );
}

export function NotificationSettings({ prefs }: { prefs: Preference[] }) {
  const t = useTranslations("settings");
  const [, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(prefs, (cur, p: Preference) => [
    ...cur.filter((x) => !(x.event_type === p.event_type && x.channel === p.channel)),
    p,
  ]);

  const toggle = (event: NotificationEvent) => {
    const enabled = !isEnabled(optimistic, event);
    startTransition(async () => {
      apply({ event_type: event, channel: "email", enabled });
      await setPreference(event, "email", enabled);
    });
  };

  return (
    <div className="flex flex-col rounded-lg border border-line bg-surf">
      <div className="flex justify-end border-b border-line px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink3">{t("email")}</div>
      {NOTIFICATION_EVENTS.map((event) => {
        const on = isEnabled(optimistic, event);
        return (
          <div key={event} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[15px] font-medium">{t(`events.${event}.title`)}</span>
              <span className="text-[13px] leading-snug text-ink3">{t(`events.${event}.hint`)}</span>
            </div>
            <button type="button" role="switch" aria-checked={on} aria-label={t(`events.${event}.title`)} onClick={() => toggle(event)}
              className={`relative h-5 w-9 flex-none cursor-pointer rounded-full transition-colors ${on ? "bg-accent" : "bg-line2"}`}>
              <span className={`absolute top-0.5 size-4 rounded-full bg-offwhite transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
