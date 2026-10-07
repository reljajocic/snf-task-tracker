"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Re-fetches the page's data every `seconds` (and when you come back to the tab), so changes
 * made by others — e.g. names from the sign-up link — show up without reloading. Skips while
 * you're typing in a field, and while the tab is hidden.
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    };
    const refresh = () => {
      if (document.visibilityState !== "visible" || typing()) return;
      last.current = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(refresh, seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > (seconds * 1000) / 2) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, seconds]);

  return null;
}
