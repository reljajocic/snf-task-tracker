"use client";

import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { portalLoadBoard, portalSaveBoard, portalUploadBoardImage, uploadBoardImage } from "@/app/actions/boards";
import type { BoardFiles } from "@/lib/boards";
import { createClient } from "@/lib/supabase/client";

// A moodboard (Excalidraw) that several people edit at once.
//  - Every change is saved (debounced) and merged per element in the database (board_merge), so
//    nobody overwrites anyone; the merged scene comes back and is reconciled into the canvas.
//  - The team also sends changes and pointers live over a private Realtime channel, and sees who's here.
//  - The portal (no login) saves through server actions and picks up others' changes by polling.
//  - Images are shrunk in the browser, stored in Storage, and kept on the board as links.

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-[14px] text-ink3">…</div>,
});

type El = { id: string; version: number; versionNonce?: number; isDeleted?: boolean; type?: string; fileId?: string | null; status?: string };
type Lib = typeof import("@excalidraw/excalidraw");
type Person = { id: string; name: string; color: string };
type Pointer = { x: number; y: number; tool: "pointer" | "laser" };

const COLORS = ["#ea693a", "#4fa3a5", "#9a7fd1", "#6fae7b", "#d6a93e", "#5b8ec2"];
const colorOf = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

/** Downscale to at most 1600px and re-encode as WebP (GIFs are kept as they are). */
async function shrink(blob: Blob): Promise<Blob> {
  if (blob.type === "image/gif") return blob;
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? blob), "image/webp", 0.82));
}

const toDataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

export function Board({
  boardId,
  token,
  initialElements,
  initialFiles,
  canEdit,
  me,
  header,
}: {
  boardId: string;
  /** Portal token: the board is opened from the client portal (no login, no live channel). */
  token?: string;
  initialElements: unknown[];
  initialFiles: BoardFiles;
  canEdit: boolean;
  /** The signed-in team member (live presence and pointers). */
  me?: { id: string; name: string };
  header?: ReactNode;
}) {
  const t = useTranslations("board");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const libRef = useRef<Lib | null>(null);
  const known = useRef(new Map<string, number>((initialElements as El[]).map((e) => [e.id, e.version])));
  const fileRefs = useRef<BoardFiles>({ ...initialFiles });
  const unsavedFiles = useRef<BoardFiles>({});
  const loadingFiles = useRef(new Set<string>());
  const uploading = useRef(new Set<string>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const lastSent = useRef(0);
  const lastPointer = useRef(0);
  const collaborators = useRef(new Map<string, { username: string; color: { background: string; stroke: string }; pointer?: Pointer; id: string }>());
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<"saved" | "saving" | "offline">("saved");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const read = () => {
      const set = document.documentElement.dataset.theme;
      setTheme(set === "light" ? "light" : set === "dark" ? "dark" : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  /** Load any images we don't have yet (from their Storage links). */
  const ensureFiles = useCallback((elements: El[]) => {
    const api = apiRef.current;
    if (!api) return;
    const have = api.getFiles();
    for (const e of elements) {
      const id = e.fileId;
      if (e.type !== "image" || !id || have[id] || loadingFiles.current.has(id)) continue;
      const ref = fileRefs.current[id];
      if (!ref) continue;
      loadingFiles.current.add(id);
      fetch(ref.url)
        .then((r) => r.blob())
        .then(toDataURL)
        .then((dataURL) => api.addFiles([{ id: id as never, dataURL: dataURL as never, mimeType: ref.mimeType as never, created: Date.now() }]))
        .catch(() => loadingFiles.current.delete(id));
    }
  }, []);

  /** Bring others' elements in without undoing anything local that's newer. */
  const apply = useCallback(
    (remote: El[]) => {
      const api = apiRef.current;
      const lib = libRef.current;
      if (!api || !lib || !remote.length) return;
      for (const e of remote) known.current.set(e.id, Math.max(known.current.get(e.id) ?? -1, e.version));
      const merged = lib.reconcileElements(api.getSceneElementsIncludingDeleted(), remote as never, api.getAppState());
      api.updateScene({ elements: merged, captureUpdate: lib.CaptureUpdateAction.NEVER });
      ensureFiles(remote);
    },
    [ensureFiles],
  );

  const changedSinceSync = () =>
    ((apiRef.current?.getSceneElementsIncludingDeleted() ?? []) as unknown as El[]).filter((e) => (known.current.get(e.id) ?? -1) < e.version);

  const save = useCallback(async () => {
    if (saving.current || !canEdit) return;
    const changed = changedSinceSync();
    const files = unsavedFiles.current;
    if (!changed.length && !Object.keys(files).length) return;
    saving.current = true;
    setStatus("saving");
    unsavedFiles.current = {};
    try {
      let merged: unknown[] | null = null;
      if (token) {
        merged = (await portalSaveBoard(token, boardId, changed, files))?.elements ?? null;
      } else {
        const { data, error } = await createClient().rpc("board_merge", { bid: boardId, incoming: changed as never, new_files: files as never });
        merged = error ? null : (data as unknown[]);
      }
      if (!merged) throw new Error("save failed");
      for (const e of changed) known.current.set(e.id, Math.max(known.current.get(e.id) ?? -1, e.version));
      apply(merged as El[]);
      setStatus("saved");
    } catch {
      unsavedFiles.current = { ...files, ...unsavedFiles.current };
      setStatus("offline");
    } finally {
      saving.current = false;
      if (changedSinceSync().length) scheduleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, boardId, canEdit, token]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 600);
  }, [save]);

  const upload = useCallback(
    async (id: string, dataURL: string) => {
      uploading.current.add(id);
      try {
        const blob = await shrink(await (await fetch(dataURL)).blob());
        const form = new FormData();
        form.set("file", blob);
        const res = token ? await portalUploadBoardImage(token, boardId, id, form) : await uploadBoardImage(boardId, id, form);
        if ("url" in res) {
          fileRefs.current[id] = { url: res.url, mimeType: blob.type };
          unsavedFiles.current[id] = fileRefs.current[id];
          scheduleSave();
        }
      } finally {
        uploading.current.delete(id);
      }
    },
    [boardId, scheduleSave, token],
  );

  const onChange = useCallback(
    (elements: readonly unknown[], _appState: unknown, files: Record<string, { id: string; dataURL: string }>) => {
      if (!canEdit) return;
      for (const f of Object.values(files)) {
        if (!fileRefs.current[f.id] && !uploading.current.has(f.id) && f.dataURL.startsWith("data:")) void upload(f.id, f.dataURL);
      }
      const changed = (elements as El[]).filter((e) => (known.current.get(e.id) ?? -1) < e.version);
      if (!changed.length) return;
      // Live: everyone else on the board sees it right away (throttled); the save makes it stick.
      const now = Date.now();
      if (channelRef.current && now - lastSent.current > 60) {
        lastSent.current = now;
        void channelRef.current.send({ type: "broadcast", event: "els", payload: { els: changed } });
      }
      scheduleSave();
    },
    [canEdit, scheduleSave, upload],
  );

  // Others' saves (and the portal's): poll the stored scene. Often in the portal, rarely for the team (live covers it).
  useEffect(() => {
    const every = token ? 2500 : 8000;
    const tick = async () => {
      if (document.hidden || saving.current) return;
      let data: { elements: unknown[]; files: BoardFiles } | null = null;
      if (token) data = await portalLoadBoard(token, boardId);
      else {
        const res = await createClient().from("boards").select("elements, files").eq("id", boardId).maybeSingle();
        data = res.data ? { elements: (res.data.elements as unknown[]) ?? [], files: (res.data.files as BoardFiles) ?? {} } : null;
      }
      if (!data) return;
      Object.assign(fileRefs.current, data.files);
      apply((data.elements as El[]).filter((e) => (known.current.get(e.id) ?? -1) < e.version));
    };
    const id = setInterval(() => void tick(), every);
    return () => clearInterval(id);
  }, [apply, boardId, token]);

  // Team: live channel (private, RLS-checked) for changes, pointers and who's here.
  useEffect(() => {
    if (token || !me) return;
    const supabase = createClient();
    let active = true;
    const showCollaborators = () => {
      const api = apiRef.current;
      if (api) api.updateScene({ collaborators: new Map(collaborators.current) as never });
    };
    (async () => {
      await supabase.realtime.setAuth();
      if (!active) return;
      const channel = supabase.channel(`board:${boardId}`, { config: { private: true, broadcast: { self: false }, presence: { key: me.id } } });
      channel
        .on("broadcast", { event: "els" }, ({ payload }) => apply((payload?.els ?? []) as El[]))
        .on("broadcast", { event: "ptr" }, ({ payload }) => {
          const p = payload as { id: string; name: string; pointer: Pointer };
          const color = colorOf(p.id);
          collaborators.current.set(p.id, { id: p.id, username: p.name, color: { background: color, stroke: color }, pointer: p.pointer });
          showCollaborators();
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<{ id: string; name: string }>();
          const here = Object.values(state).flat();
          setPeople(here.filter((x) => x.id !== me.id).map((x) => ({ id: x.id, name: x.name, color: colorOf(x.id) })));
          for (const id of [...collaborators.current.keys()]) if (!here.some((x) => x.id === id)) collaborators.current.delete(id);
          showCollaborators();
        })
        .subscribe(async (s) => {
          if (s === "SUBSCRIBED") await channel.track({ id: me.id, name: me.name });
        });
      channelRef.current = channel;
    })();
    return () => {
      active = false;
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [apply, boardId, me, token]);

  // Flush on leave.
  useEffect(() => {
    const flush = () => void save();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  const onPointerUpdate = useCallback(
    (payload: { pointer: Pointer }) => {
      const ch = channelRef.current;
      if (!ch || !me) return;
      const now = Date.now();
      if (now - lastPointer.current < 40) return;
      lastPointer.current = now;
      void ch.send({ type: "broadcast", event: "ptr", payload: { id: me.id, name: me.name, pointer: payload.pointer } });
    },
    [me],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 lg:px-6">
        {header}
        <div className="ml-auto flex items-center gap-3">
          {people.length > 0 && (
            <div className="flex items-center gap-1.5" title={people.map((p) => p.name).join(", ")}>
              {people.slice(0, 5).map((p) => (
                <span key={p.id} className="grid size-7 place-items-center rounded-full text-[12px] font-semibold text-ink-black" style={{ background: p.color }}>
                  {p.name.charAt(0)}
                </span>
              ))}
              <span className="text-[13px] text-ink3">{t("here", { count: people.length })}</span>
            </div>
          )}
          {canEdit && <span className="text-[13px] text-ink3">{t(`status.${status}`)}</span>}
          {!canEdit && <span className="text-[13px] text-ink3">{t("viewOnly")}</span>}
        </div>
      </div>
      <div className="relative min-h-[420px] flex-1">
        <div className="absolute inset-0">
          <Excalidraw
            excalidrawAPI={(api) => {
              apiRef.current = api;
              void import("@excalidraw/excalidraw").then((lib) => {
                libRef.current = lib;
                ensureFiles(initialElements as El[]);
              });
            }}
            initialData={{ elements: initialElements as never, appState: { viewBackgroundColor: "transparent" }, scrollToContent: true }}
            onChange={onChange as never}
            onPointerUpdate={onPointerUpdate as never}
            isCollaborating={!token}
            viewModeEnabled={!canEdit}
            theme={theme}
            UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, toggleTheme: false, clearCanvas: false, changeViewBackgroundColor: false } }}
          />
        </div>
      </div>
    </div>
  );
}
