/**
 * Square-crop a menu photo to a fixed JPEG size for upload.
 * Port of office.soulandsip.com/lib/menu-image-crop.ts
 */

export const MENU_IMAGE_OUTPUT_SIZE = 800;
export const MENU_IMAGE_JPEG_QUALITY = 0.85;

/** Max size when picking before crop (Soul & Sip office). */
export const MAX_MENU_IMAGE_PICK_BYTES = 20 * 1024 * 1024;

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
        const baseName = fileName.replace(/\.[^.]+$/, "") || "menu-image";
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
 * Crop imageSrc to pixelCrop, then resize to a square JPEG for menu upload.
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {string} fileName
 * @param {{ outputSize?: number, quality?: number }} [options]
 * @returns {Promise<File>}
 */
export async function cropMenuImageToJpeg(imageSrc, pixelCrop, fileName, options = {}) {
  const outputSize = options.outputSize ?? MENU_IMAGE_OUTPUT_SIZE;
  const quality = options.quality ?? MENU_IMAGE_JPEG_QUALITY;

  const image = await loadImageFromUrl(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

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
    outputSize,
    outputSize
  );

  return canvasToJpegFile(canvas, fileName, quality);
}
