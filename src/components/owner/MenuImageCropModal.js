"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { cropMenuImageToJpeg, MENU_IMAGE_JPEG_QUALITY, MENU_IMAGE_OUTPUT_SIZE } from "@/lib/menu-image-crop";

/**
 * Crop modal: drag to recenter, zoom, then JPEG compress.
 * Defaults match menu square crop; pass aspect / output for page-content images.
 */
export function MenuImageCropModal({
  isOpen,
  imageSrc,
  fileName,
  onCancel,
  onConfirm,
  aspect = 1,
  outputWidth,
  outputHeight,
  quality = MENU_IMAGE_JPEG_QUALITY,
  title,
  description,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const outW = outputWidth ?? (aspect === 1 ? MENU_IMAGE_OUTPUT_SIZE : undefined) ?? MENU_IMAGE_OUTPUT_SIZE;
  const outH = outputHeight ?? (aspect === 1 ? MENU_IMAGE_OUTPUT_SIZE : undefined) ?? outW;

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    setError(null);

    try {
      const file = await cropMenuImageToJpeg(
        imageSrc,
        croppedAreaPixels,
        fileName || "image.jpg",
        {
          outputWidth: outW,
          outputHeight: outH,
          quality,
        }
      );
      onConfirm(file);
    } catch {
      setError("Could not crop this image. Try another photo.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isOpen || !imageSrc) return null;

  const heading =
    title ||
    (aspect === 1 ? "Crop to square" : "Crop image");
  const body =
    description ||
    (aspect === 1
      ? "Drag to recenter and zoom so the dish fills the square."
      : "Drag to recenter and zoom so the important part fills the frame.");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-image-crop-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-owner-border bg-owner-card shadow-2xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-owner-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 id="menu-image-crop-title" className="text-lg font-semibold text-owner-charcoal">
            {heading}
          </h2>
          <p className="mt-1 text-sm text-owner-muted">{body}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-zinc-900 sm:h-72">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div>
            <label htmlFor="menu-image-zoom" className="mb-1.5 block text-sm font-medium text-owner-charcoal">
              Zoom
            </label>
            <input
              id="menu-image-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={isProcessing}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-owner-action"
            />
          </div>

          {error ? (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-owner-border px-4 py-3 sm:px-6">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="touch-manipulation rounded-lg border border-owner-border px-4 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || !croppedAreaPixels}
            onClick={() => void handleConfirm()}
            className="touch-manipulation rounded-lg bg-owner-action px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isProcessing ? "Processing…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
