"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { removePushDevice, savePushDevice, testPush } from "./actions";

type State = "loading" | "unsupported" | "homeScreen" | "blocked" | "off" | "on";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64url: string) {
  const raw = atob((base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * Push on this device: one tap to turn on (the phone asks for permission), a test, and off.
 * On an iPhone it works only in the app added to the home screen, so Safari gets that hint instead.
 */
export function PushDevice() {
  const t = useTranslations("settings.pushBlock");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !KEY) next = isIos() && !standalone() ? "homeScreen" : "unsupported";
      else if (Notification.permission === "denied") next = "blocked";
      else {
        const reg = await navigator.serviceWorker.register("/sw.js");
        next = (await reg.pushManager.getSubscription()) ? "on" : "off";
      }
      if (live) setState(next);
    })().catch(() => live && setState("unsupported"));
    return () => {
      live = false;
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const res = await savePushDevice(sub.toJSON());
      if (res.error) setNote(res.error);
      else setState("on");
    } catch {
      setState(Notification.permission === "denied" ? "blocked" : "off");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushDevice(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    const sent = await testPush();
    setNote(sent ? t("testSent") : t("testFailed"));
    setBusy(false);
  };

  if (state === "loading") return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surf px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-medium">{t("title")}</span>
          <span className="text-[13px] leading-snug text-ink3">{t(state)}</span>
        </div>
        {state === "off" && (
          <Button type="button" size="sm" disabled={busy} onClick={turnOn}>
            {t("turnOn")}
          </Button>
        )}
        {state === "on" && (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={test}>
              {t("test")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={turnOff}>
              {t("turnOff")}
            </Button>
          </div>
        )}
      </div>
      {note && <p className="text-[13px] text-ink2">{note}</p>}
    </div>
  );
}
