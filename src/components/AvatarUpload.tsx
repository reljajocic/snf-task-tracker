"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { removeAvatar, uploadAvatar } from "@/app/actions/avatar";
import { AvatarCropper } from "@/components/AvatarCropper";
import { Avatar } from "@/components/ui/Avatar";

type Person = { id: string; initials: string; avatar_bg: string; avatar_fg: string; full_name?: string; avatar_url?: string | null };

/** Photo + "Change photo" / "Remove". Used in Settings (yourself) and on Team (the admin, for anyone). */
export function AvatarUpload({ person, size = 56, compact = false }: { person: Person; size?: number; compact?: boolean }) {
  const t = useTranslations("avatar");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [cropping, setCropping] = useState<File | null>(null);

  // Picking a file opens the cropper; the cropped 256×256 image is what gets uploaded.
  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(t("failed"));
    setError(null);
    setCropping(file);
    if (input.current) input.current.value = "";
  };
  const upload = (blob: Blob) => {
    setCropping(null);
    start(async () => {
      const form = new FormData();
      form.set("userId", person.id);
      form.set("file", blob, "avatar.webp");
      const res = await uploadAvatar(form);
      setError(res.error);
      if (!res.error) router.refresh();
    });
  };
  const cropper = cropping && <AvatarCropper file={cropping} background={person.avatar_bg} onCancel={() => setCropping(null)} onDone={upload} />;

  const btn = "cursor-pointer text-[13px] font-medium disabled:opacity-50";
  if (compact) {
    // Team list: tap the avatar to change it (a small pencil shows it's editable).
    return (
      <>
      <button type="button" onClick={() => input.current?.click()} disabled={pending} title={error ?? t("change")} className={`relative flex-none cursor-pointer rounded-full ${pending ? "opacity-60" : ""}`}>
        <Avatar person={person} size={size} />
        <span className={`absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full border border-line2 bg-pop text-[10px] ${error ? "text-red-ink" : "text-ink2"}`}>✎</span>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </button>
      {/* Outside the button: React events from the (portalled) cropper would otherwise reach it. */}
      {cropper}
      </>
    );
  }
  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-4"}`}>
      <button type="button" onClick={() => input.current?.click()} disabled={pending} className={`relative cursor-pointer rounded-full ${pending ? "opacity-60" : ""}`} title={t("change")}>
        <Avatar person={person} size={size} />
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {cropper}
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-3">
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className={`${btn} text-rust-ink`}>
            {pending ? t("uploading") : person.avatar_url ? t("change") : t("add")}
          </button>
          {person.avatar_url && !pending && (
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  const res = await removeAvatar(person.id);
                  setError(res.error);
                  if (!res.error) router.refresh();
                })
              }
              className={`${btn} text-ink3 hover:text-red-ink`}
            >
              {t("remove")}
            </button>
          )}
        </div>
        {error && <span className="text-[12px] text-red-ink">{error}</span>}
      </div>
    </div>
  );
}
