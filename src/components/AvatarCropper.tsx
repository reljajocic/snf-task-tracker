"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEW = 280; // the round window on screen
const OUT = 256; // the saved image

/**
 * Position a photo in the avatar circle: drag to move (any direction), slider to zoom (also out,
 * smaller than the circle). Uncovered parts are filled with the avatar colour. Returns 256×256 WebP.
 */
export function AvatarCropper({
  file,
  background = "#2F2D2E",
  onCancel,
  onDone,
}: {
  file: File;
  background?: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const t = useTranslations("avatar");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = the short side fills the circle
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image top-left inside the window
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const cover = VIEW / Math.min(image.naturalWidth, image.naturalHeight);
      setImg(image);
      setPos({ x: (VIEW - image.naturalWidth * cover) / 2, y: (VIEW - image.naturalHeight * cover) / 2 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!img) return null;
  const cover = VIEW / Math.min(img.naturalWidth, img.naturalHeight);
  const scale = cover * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  // Free movement, but a quarter of the photo always stays in the circle so it can't be lost.
  const clamp = (p: { x: number; y: number }, sw = w, sh = h) => ({
    x: Math.min(VIEW - sw * 0.25, Math.max(sw * 0.25 - sw, p.x)),
    y: Math.min(VIEW - sh * 0.25, Math.max(sh * 0.25 - sh, p.y)),
  });
  const at = clamp(pos);

  const setZoomKeepingCenter = (z: number) => {
    const ns = cover * z;
    // keep the point under the circle's centre where it is
    const cx = (VIEW / 2 - at.x) / scale;
    const cy = (VIEW / 2 - at.y) / scale;
    setZoom(z);
    setPos(clamp({ x: VIEW / 2 - cx * ns, y: VIEW / 2 - cy * ns }, img.naturalWidth * ns, img.naturalHeight * ns));
  };

  const save = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    const k = OUT / VIEW;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, at.x * k, at.y * k, w * k, h * k);
    canvas.toBlob((b) => b && onDone(b), "image/webp", 0.88);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[var(--overlay)] p-4" onClick={onCancel}>
      <div className="flex w-full max-w-[360px] flex-col items-center gap-5 rounded-2xl border border-line2 bg-pop p-6 shadow-[var(--shadow-overlay)]" onClick={(e) => e.stopPropagation()}>
        <span className="display self-start text-[18px]">{t("cropTitle")}</span>
        <div
          className="relative cursor-grab touch-none overflow-hidden rounded-full active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW, background }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { px: e.clientX, py: e.clientY, x: at.x, y: at.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) setPos(clamp({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }));
          }}
          onPointerUp={() => (drag.current = null)}
          onWheel={(e) => setZoomKeepingCenter(Math.min(4, Math.max(0.5, zoom - e.deltaY * 0.002)))}
        >
          <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: at.x, top: at.y, width: w, height: h }} />
        </div>
        <label className="flex w-full items-center gap-3 text-[13px] font-medium text-ink3">
          {t("zoom")}
          <input type="range" min={0.5} max={4} step={0.01} value={zoom} onChange={(e) => setZoomKeepingCenter(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
        </label>
        <span className="-mt-2 self-start text-[12.5px] text-ink3">{t("cropHint")}</span>
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 cursor-pointer rounded-md px-4 text-[14px] font-medium text-ink2 hover:text-ink">
            {t("cancel")}
          </button>
          <button type="button" onClick={save} className="h-10 cursor-pointer rounded-md bg-accent px-5 text-[14px] font-semibold text-charcoal">
            {t("save")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
