"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getOwnerWebsiteContent,
  updateOwnerWebsiteContent,
  uploadOwnerWebsiteContentImage,
} from "@/lib/api";
import { MAX_IMAGE_BYTES, validateImageSize } from "@/components/owner/ImageUploadDropzone";

function normalizeGalleryImages(contentJson) {
  if (!contentJson || typeof contentJson !== "object") return [];
  const raw =
    contentJson.gallery_images ??
    contentJson.galleryImages ??
    contentJson.image_gallery ??
    contentJson.imageGallery ??
    [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

export function GalleryTab({ restaurantId, token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentJson, setContentJson] = useState({});
  const [galleryImages, setGalleryImages] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSave = useMemo(() => !!token && !!restaurantId, [token, restaurantId]);

  useEffect(() => {
    if (!canSave) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await getOwnerWebsiteContent(token, restaurantId);
        const nextContent = res?.content_json ?? res?.data?.content_json ?? res?.data ?? res ?? {};
        if (cancelled) return;
        setContentJson(nextContent && typeof nextContent === "object" ? nextContent : {});
        setGalleryImages(normalizeGalleryImages(nextContent));
      } catch {
        if (cancelled) return;
        setContentJson({});
        setGalleryImages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSave, restaurantId, token]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3500);
    return () => clearTimeout(t);
  }, [success]);

  const persistGallery = async (nextImages, successMessage = "Gallery saved.") => {
    if (!canSave) throw new Error("You must be logged in to manage gallery images.");
    setSaving(true);
    try {
      const nextContent = {
        ...contentJson,
        gallery_images: nextImages,
      };
      await updateOwnerWebsiteContent(token, restaurantId, nextContent);
      setContentJson(nextContent);
      setGalleryImages(nextImages);
      setSuccess(successMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files) => {
    setError("");
    if (!files || files.length === 0) return;
    const selected = Array.from(files);

    const invalid = selected.find((file) => validateImageSize(file, MAX_IMAGE_BYTES));
    if (invalid) {
      setError(validateImageSize(invalid, MAX_IMAGE_BYTES) || "Invalid file selected.");
      return;
    }

    const nonImage = selected.find((file) => !String(file?.type || "").startsWith("image/"));
    if (nonImage) {
      setError("Please upload image files only (JPEG, PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    setSaving(true);
    try {
      const uploadedUrls = [];
      for (const file of selected) {
        const res = await uploadOwnerWebsiteContentImage(token, restaurantId, file);
        const imageUrl = res?.full_url ?? res?.url ?? res?.data?.full_url ?? res?.data?.url;
        if (imageUrl) uploadedUrls.push(imageUrl);
      }
      if (uploadedUrls.length === 0) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }
      const nextImages = [...galleryImages, ...uploadedUrls];
      await persistGallery(nextImages, "Gallery images uploaded and saved.");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to upload gallery images.");
      setSaving(false);
    }
  };

  const removeImage = async (index) => {
    setError("");
    const nextImages = galleryImages.filter((_, i) => i !== index);
    try {
      await persistGallery(nextImages, "Gallery image removed.");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to remove gallery image.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-owner-border bg-owner-card p-6">
        <p className="text-owner-muted">Loading gallery...</p>
      </div>
    );
  }

  return (
    <section className="owner-card rounded-xl border border-owner-border p-6">
      <h3 className="text-xl font-semibold text-owner-charcoal">Homepage image gallery</h3>
      <p className="mt-2 text-sm text-owner-muted">
        Upload gallery images for the public homepage. Every file must be smaller than 500 KB.
      </p>

      {(error || success) && (
        <div className="mt-4 space-y-2">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-owner-success/40 bg-white p-3 text-sm text-owner-success">
              {success}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-owner-border bg-owner-paper p-4">
        <label className="block text-sm font-medium text-owner-charcoal">
          Add gallery images
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg,image/webp,image/gif,image/svg+xml"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
            disabled={saving || !canSave}
            className="mt-2 block w-full text-sm text-owner-charcoal file:mr-3 file:rounded-lg file:border file:border-owner-border file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-owner-charcoal hover:file:bg-owner-paper"
          />
        </label>
        <p className="mt-2 text-xs text-owner-muted">Max size: 500 KB per image.</p>
      </div>

      {galleryImages.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((src, index) => (
            <article key={`${src}-${index}`} className="overflow-hidden rounded-lg border border-owner-border bg-white">
              <img
                src={src}
                alt={`Gallery ${index + 1}`}
                className="h-40 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-xs text-owner-muted">Image {index + 1}</p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => removeImage(index)}
                  className="touch-manipulation rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-owner-muted">No gallery images yet.</p>
      )}
    </section>
  );
}

