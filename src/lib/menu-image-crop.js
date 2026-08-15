/**
 * Crop / compress images for owner uploads (menu square + wide page-content).
 */

export const MENU_IMAGE_OUTPUT_SIZE = 800;
export const MENU_IMAGE_JPEG_QUALITY = 0.85;

/** Max size when picking before crop. */
export const MAX_MENU_IMAGE_PICK_BYTES = 20 * 1024 * 1024;

/** Page-content post-crop max (~1.5 MB). */
export const MAX_WEBSITE_CONTENT_IMAGE_BYTES = Math.round(1.5 * 1024 * 1024);

/** Target max after crop for menu item/category images. */
export const MAX_MENU_IMAGE_OUTPUT_BYTES = 2 * 1024 * 1024;

const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];
const SIZE_SCALE_STEPS = [1, 0.85, 0.7, 0.55];

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image for cropping."));
    image.src = url;
  });
}

function canvasToJpegFile(canvas, fileName, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image crop failed."));
          return;
        }
        const baseName = fileName.replace(/\.[^.]+$/, "") || "image";
        resolve(
          new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
        );
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Crop imageSrc to pixelCrop, then resize to JPEG for upload.
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {string} fileName
 * @param {{
 *   outputSize?: number,
 *   outputWidth?: number,
 *   outputHeight?: number,
 *   quality?: number,
 * }} [options]
 * @returns {Promise<File>}
 */
export async function cropMenuImageToJpeg(imageSrc, pixelCrop, fileName, options = {}) {
  const quality = options.quality ?? MENU_IMAGE_JPEG_QUALITY;
  const outputWidth =
    options.outputWidth ?? options.outputSize ?? MENU_IMAGE_OUTPUT_SIZE;
  const outputHeight =
    options.outputHeight ?? options.outputSize ?? MENU_IMAGE_OUTPUT_SIZE;

  const image = await loadImageFromUrl(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image crop failed.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return canvasToJpegFile(canvas, fileName, quality);
}

/**
 * Crop then retry JPEG quality / dimensions until file is under maxBytes.
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {string} fileName
 * @param {{
 *   outputWidth?: number,
 *   outputHeight?: number,
 *   maxBytes?: number,
 *   quality?: number,
 * }} [options]
 * @returns {Promise<File>}
 */
export async function cropMenuImageToJpegUnderMax(imageSrc, pixelCrop, fileName, options = {}) {
  const maxBytes = options.maxBytes ?? MAX_MENU_IMAGE_OUTPUT_BYTES;
  const baseW = options.outputWidth ?? options.outputSize ?? MENU_IMAGE_OUTPUT_SIZE;
  const baseH = options.outputHeight ?? options.outputSize ?? MENU_IMAGE_OUTPUT_SIZE;
  const startQuality = options.quality ?? MENU_IMAGE_JPEG_QUALITY;

  let lastFile = null;

  for (const scale of SIZE_SCALE_STEPS) {
    const outputWidth = Math.max(240, Math.round(baseW * scale));
    const outputHeight = Math.max(240, Math.round(baseH * scale));
    const qualities =
      scale === 1
        ? [startQuality, ...QUALITY_STEPS.filter((q) => q < startQuality - 0.01)]
        : QUALITY_STEPS;

    for (const quality of qualities) {
      lastFile = await cropMenuImageToJpeg(imageSrc, pixelCrop, fileName, {
        outputWidth,
        outputHeight,
        quality,
      });
      if (lastFile.size <= maxBytes) return lastFile;
    }
  }

  if (lastFile && lastFile.size <= maxBytes) return lastFile;
  if (lastFile) return lastFile;

  throw new Error("Could not compress this image enough. Try another photo.");
}
