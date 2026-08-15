/**
 * Crop / compress images for owner uploads (menu square + wide page-content).
 */

export const MENU_IMAGE_OUTPUT_SIZE = 800;
export const MENU_IMAGE_JPEG_QUALITY = 0.85;

/** Max size when picking before crop. */
export const MAX_MENU_IMAGE_PICK_BYTES = 20 * 1024 * 1024;

/** Page-content post-crop max (~1.5 MB). */
export const MAX_WEBSITE_CONTENT_IMAGE_BYTES = Math.round(1.5 * 1024 * 1024);

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
