"use client";

import { useSyncExternalStore } from "react";

const KEY = "snf-portal-name";
const listeners = new Set<() => void>();
// Fallback when storage is blocked (private mode): keep the name for this page session.
let memory = "";

function read() {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The client's name for approvals, remembered on this device (there's no login). */
export function useApprover() {
  const name = useSyncExternalStore(subscribe, read, () => "");
  const save = (v: string) => {
    memory = v;
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [name, save] as const;
}
