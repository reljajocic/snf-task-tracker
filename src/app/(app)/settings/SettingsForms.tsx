"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/tasks/fields";
import type { Profile } from "@/lib/auth";
import { NOTIFICATION_EVENTS, isEnabled, type NotificationEvent, type Preference } from "@/lib/notifications";
import { LOCALES, LOCALE_NAME, type Locale } from "@/lib/locale";
import { THEMES, THEME_COOKIE, type Theme } from "@/lib/theme";
import { saveTheme } from "@/components/shell/actions";
import { inkOn } from "@/lib/color";
import { AVATAR_COLORS } from "@/lib/team";
import { saveProfile, setLanguage, setPreference } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState(saveProfile, null);
  const [color, setColor] = useState(profile.avatar_bg);
  const preset = AVATAR_COLORS.some((c) => c.bg.toLowerCase() === color.toLowerCase());
  const [name, setName] = useState(profile.full_name);
  const [initials, setInitials] = useState(profile.initials);
  const preview = { ...profile, full_name: name, initials: initials || name.charAt(0).toUpperCase(), avatar_bg: color, avatar_fg: inkOn(color) };

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-line bg-surf p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AvatarUpload person={preview} size={56} />
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
        <input type="hidden" name="avatar_bg" value={color} />
        <div className="flex flex-wrap items-center gap-2">
          {AVATAR_COLORS.map((c) => {
            const on = color.toLowerCase() === c.bg.toLowerCase();
            return (
              <button key={c.bg} type="button" aria-label={c.bg} aria-pressed={on} onClick={() => setColor(c.bg)}
                className={`size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-[var(--surf)] ${on ? "ring-2 ring-accent" : ""}`} style={{ background: c.bg }} />
            );
          })}
          {/* Any colour: the swatch shows the custom pick once there is one. */}
          <label
            title={t("customColor")}
            className={`relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--surf)] ${!preset ? "ring-2 ring-accent" : ""}`}
            style={{ background: preset ? "conic-gradient(#ea693a, #d6a93e, #6fae7b, #4fa3a5, #5b8ec2, #9a7fd1, #ea693a)" : color }}
          >
            {preset && <span className="grid size-4 place-items-center rounded-full bg-[var(--surf)] text-[11px] text-ink2">+</span>}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
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

function applyTheme(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  if (theme === "system") (window as unknown as { __snfApplySystemTheme?: () => void }).__snfApplySystemTheme?.();
  else document.documentElement.dataset.theme = theme;
}

/** Light, dark, or follow the device (default). Applied at once; remembered in a cookie + the profile. */
export function ThemeSetting({ current }: { current: Theme }) {
  const t = useTranslations("settings");
  const [value, setValue] = useState(current);
  const pick = (theme: Theme) => {
    setValue(theme);
    applyTheme(theme);
    void saveTheme(theme);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          aria-pressed={value === theme}
          onClick={() => pick(theme)}
          className={`h-11 cursor-pointer rounded-full border px-5 text-[14px] font-medium ${value === theme ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`}
        >
          {t(`themes.${theme}`)}
        </button>
      ))}
    </div>
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
