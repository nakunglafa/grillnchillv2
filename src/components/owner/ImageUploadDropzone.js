"use client";

import { useEffect, useState, useRef } from "react";
import { MenuImageCropModal } from "@/components/owner/MenuImageCropModal";
import { MAX_MENU_IMAGE_PICK_BYTES, MENU_IMAGE_JPEG_QUALITY } from "@/lib/menu-image-crop";

/** Max image size for logo (e.g. restaurant logo): 500 KB */
export const MAX_IMAGE_BYTES = 500 * 1024;

/** Max image size for menu category/item per API doc: 2 MB (after crop) */
export const MAX_MENU_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Validates image file size. Returns error message or null.
 * @param {File} file
 * @param {number} [maxBytes] - defaults to MAX_IMAGE_BYTES (500 KB)
 */
export function validateImageSize(file, maxBytes = MAX_IMAGE_BYTES) {
  if (!(file instanceof File)) return null;
  if (file.size > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
    return `Image must be ${maxMB} MB or less (selected: ${(file.size / 1024).toFixed(0)} KB).`;
  }
  return null;
}

/**
 * Image upload with drag-and-drop.
 * When enableCrop is true: pick up to 20 MB → crop modal → JPEG ≤ maxBytes.
 *
 * @param {boolean} [enableCrop]
 * @param {number} [cropAspect]
 * @param {number} [cropOutputWidth]
 * @param {number} [cropOutputHeight]
 * @param {number} [cropQuality]
 * @param {string} [cropTitle]
 * @param {string} [cropDescription]
 * @param {string} [dropHintWhenCrop]
 */
export function ImageUploadDropzone({
  id,
  label,
  value,
  onChange,
  onError,
  className = "",
  accept = "image/*",
  dropHint = "Drop image or click to choose (max 500 KB)",
  maxBytes = MAX_IMAGE_BYTES,
  enableCrop = false,
  cropAspect = 1,
  cropOutputWidth,
  cropOutputHeight,
  cropQuality = MENU_IMAGE_JPEG_QUALITY,
  cropTitle,
  cropDescription,
  dropHintWhenCrop,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropFileName, setCropFileName] = useState("image.jpg");
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function closeCrop() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    clearInput();
  }

  const handleFile = (file) => {
    if (!file) {
      onChange(undefined);
      return;
    }
    if (!file.type.startsWith("image/")) {
      onError("Please select an image file (JPEG, PNG, JPG, GIF, or SVG).");
      return;
    }

    if (enableCrop) {
      if (file.type === "image/svg+xml") {
        onError("SVG cannot be cropped. Use JPEG, PNG, GIF, or WebP.");
        clearInput();
        return;
      }
      const pickErr = validateImageSize(file, MAX_MENU_IMAGE_PICK_BYTES);
      if (pickErr) {
        onError(pickErr);
        clearInput();
        return;
      }
      setCropFileName(file.name || "image.jpg");
      setCropSrc(URL.createObjectURL(file));
      return;
    }

    const err = validateImageSize(file, maxBytes);
    if (err) {
      onError(err);
      return;
    }
    onChange(file);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file ?? undefined);
    if (!enableCrop) e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

  function handleCropConfirm(file) {
    const err = validateImageSize(file, maxBytes);
    if (err) {
      onError(err);
      closeCrop();
      return;
    }
    closeCrop();
    onChange(file);
  }

  const hint = enableCrop
    ? dropHintWhenCrop ||
      (cropAspect === 1
        ? "Drop or click — crop to square; large photos are resized automatically."
        : "Drop or click — crop and compress; large photos are resized automatically.")
    : dropHint;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`
          flex min-h-[80px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-4 text-center text-sm
          transition-colors
          ${
            isDragOver
              ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-400 dark:bg-emerald-900/20"
              : "border-zinc-300 bg-zinc-50/50 dark:border-zinc-600 dark:bg-zinc-800/50"
          }
        `}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={
            enableCrop
              ? "image/jpeg,image/png,image/jpg,image/gif,image/webp"
              : accept
          }
          onChange={handleChange}
          className="sr-only"
        />
        <span className="text-zinc-600 dark:text-zinc-400">{hint}</span>
        {value instanceof File && (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{value.name}</span>
        )}
      </div>

      {enableCrop ? (
        <MenuImageCropModal
          key={cropSrc ?? "closed"}
          isOpen={Boolean(cropSrc)}
          imageSrc={cropSrc}
          fileName={cropFileName}
          onCancel={closeCrop}
          onConfirm={handleCropConfirm}
          aspect={cropAspect}
          outputWidth={cropOutputWidth}
          outputHeight={cropOutputHeight}
          quality={cropQuality}
          title={cropTitle}
          description={cropDescription}
        />
      ) : null}
    </div>
  );
}
