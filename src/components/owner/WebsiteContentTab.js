"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageUploadDropzone, MAX_IMAGE_BYTES } from "@/components/owner/ImageUploadDropzone";
import websiteContentDefaults from "@/data/website-content.json";
import {
  getOwnerWebsiteContent,
  updateOwnerWebsiteContent,
  uploadOwnerWebsiteContentImage,
} from "@/lib/api";

/** Only fields used on grillnchill.pt location pages. */
const IMAGE_FIELDS = [
  {
    key: "heroMainImage",
    label: "Feature image",
    recommendation: "Wide photo for this location’s page hero. Recommended 1600×900. Max 500 KB.",
  },
];

const DEFAULT_FORM = {
  storyTitle: "",
  storyText: "",
  heroMainImage: "",
};

function apiToFormContent(content) {
  if (!content || typeof content !== "object") return {};
  return {
    storyTitle: content.story_title ?? content.storyTitle ?? "",
    storyText: content.story_text ?? content.storyText ?? "",
    heroMainImage: content.hero_main_image_url ?? content.heroMainImage ?? "",
  };
}

function formToApiContent(form, baseContent = {}) {
  return {
    ...(baseContent && typeof baseContent === "object" ? baseContent : {}),
    story_title: form.storyTitle || "",
    story_text: form.storyText || "",
    hero_main_image_url: form.heroMainImage || "",
  };
}

export function WebsiteContentTab({ restaurantId, token }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [baseContentJson, setBaseContentJson] = useState({});
  const [uploadFiles, setUploadFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [lastServerUpdate, setLastServerUpdate] = useState(null);
  const restaurantContentId = String(restaurantId || "default");
  const defaultFromFile = useMemo(() => {
    const fallback = websiteContentDefaults?.default ?? {};
    const specific = websiteContentDefaults?.[restaurantContentId] ?? {};
    return apiToFormContent({ ...fallback, ...specific });
  }, [restaurantContentId]);

  useEffect(() => {
    if (!restaurantContentId || !token) {
      setLoadingSaved(false);
      return;
    }
    let cancelled = false;
    setUploadFiles({});
    setError("");
    setSuccess("");
    setLoadingSaved(true);
    (async () => {
      try {
        const res = await getOwnerWebsiteContent(token, restaurantContentId);
        const saved = res?.content_json ?? res?.data?.content_json ?? res?.data ?? res;
        if (cancelled) return;
        if (saved && typeof saved === "object") {
          setBaseContentJson(saved);
          setForm({ ...DEFAULT_FORM, ...defaultFromFile, ...apiToFormContent(saved) });
        } else {
          setBaseContentJson({});
          setForm({ ...DEFAULT_FORM, ...defaultFromFile });
        }
      } catch {
        if (cancelled) return;
        setBaseContentJson({});
        setForm({ ...DEFAULT_FORM, ...defaultFromFile });
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantContentId, defaultFromFile, token]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const imagePreviews = useMemo(() => {
    const out = {};
    IMAGE_FIELDS.forEach((field) => {
      if (uploadFiles[field.key] instanceof File) {
        out[field.key] = URL.createObjectURL(uploadFiles[field.key]);
      }
    });
    return out;
  }, [uploadFiles]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach((url) => {
        if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const persistForm = async (nextForm, successMessage) => {
    if (!token) throw new Error("You must be logged in to save page content.");
    const payload = formToApiContent(nextForm, baseContentJson);
    const res = await updateOwnerWebsiteContent(token, restaurantContentId, payload);
    setBaseContentJson(payload);
    const message = successMessage || res?.message || res?.data?.message || "Page content saved.";
    setSuccess(message);
    setLastServerUpdate({
      message,
      at: new Date().toISOString(),
    });
    return res;
  };

  const handleImageUpload = async (key, file) => {
    setError("");
    if (!file) {
      setUploadFiles((prev) => ({ ...prev, [key]: undefined }));
      return;
    }
    try {
      if (!token) throw new Error("You must be logged in to upload images.");
      setSaving(true);
      const uploadRes = await uploadOwnerWebsiteContentImage(token, restaurantContentId, file);
      const imageUrl =
        uploadRes?.full_url ?? uploadRes?.url ?? uploadRes?.data?.full_url ?? uploadRes?.data?.url;
      if (!imageUrl) throw new Error("Upload succeeded but no image URL was returned.");
      const field = IMAGE_FIELDS.find((f) => f.key === key);
      let nextForm;
      setForm((prev) => {
        nextForm = { ...prev, [key]: imageUrl };
        return nextForm;
      });
      setUploadFiles((prev) => ({ ...prev, [key]: file }));
      await persistForm(nextForm, `${field?.label || "Image"} updated and saved.`);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await persistForm(form, "Page content saved.");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to save page content.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-owner-border bg-owner-card px-3 py-2 text-xs text-owner-charcoal placeholder:text-owner-muted md:rounded-xl md:px-4 md:py-2.5 md:text-sm";
  const labelClass =
    "mb-0.5 block text-xs font-medium text-owner-charcoal md:mb-1 md:text-sm";
  const sectionClass =
    "rounded-lg border border-owner-border bg-owner-card p-4 md:rounded-xl md:p-6";
  const btnPrimaryClass =
    "touch-manipulation min-h-[44px] rounded-lg bg-owner-action px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 md:min-h-[48px] md:rounded-xl md:px-5 md:py-3 md:text-sm";

  if (loadingSaved) {
    return (
      <div className="rounded-lg border border-owner-border bg-owner-card p-4 md:p-6">
        <p className="text-xs text-owner-muted md:text-sm">Loading page content…</p>
      </div>
    );
  }

  return (
    <div className="max-w-full min-w-0 space-y-3 md:space-y-4">
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600 md:p-3 md:text-sm">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-owner-success/40 bg-white p-2 text-xs text-owner-success md:p-3 md:text-sm">
              {success}
            </p>
          )}
          {lastServerUpdate?.at && (
            <p className="rounded-md border border-owner-border bg-owner-paper p-2 text-[11px] text-owner-muted md:p-3 md:text-xs">
              Last server update: {new Date(lastServerUpdate.at).toLocaleString()}.
            </p>
          )}
        </div>
      )}

      <section className={sectionClass}>
        <h3 className="mb-1 text-base font-semibold text-owner-charcoal md:mb-2 md:text-xl">
          History &amp; story
        </h3>
        <p className="mb-3 text-[11px] leading-snug text-owner-muted md:mb-4 md:text-sm md:leading-normal">
          Shown on this location’s public page. Leave blank to hide the history section.
        </p>
        <form onSubmit={handleSave} className="space-y-3 md:space-y-4">
          <label>
            <span className={labelClass}>Heading</span>
            <input
              type="text"
              value={form.storyTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, storyTitle: e.target.value }))}
              className={inputClass}
              placeholder="Our history"
            />
          </label>
          <label>
            <span className={labelClass}>Story</span>
            <textarea
              value={form.storyText}
              onChange={(e) => setForm((prev) => ({ ...prev, storyText: e.target.value }))}
              rows={5}
              className={inputClass}
              placeholder="Tell guests about this Grill N Chill location…"
            />
          </label>
          <button type="submit" disabled={saving} className={btnPrimaryClass}>
            {saving ? "Saving…" : "Save story"}
          </button>
        </form>
      </section>

      <section className={sectionClass}>
        <h3 className="mb-1 text-base font-semibold text-owner-charcoal md:mb-2 md:text-xl">
          Feature image
        </h3>
        <p className="mb-3 text-[11px] leading-snug text-owner-muted md:mb-4 md:text-sm md:leading-normal">
          Hero background on this location’s public page. Uploads save automatically.
        </p>

        {IMAGE_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <label>
              <span className={labelClass}>{field.label} (URL)</span>
              <input
                type="url"
                value={form[field.key] || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="https://..."
                className={inputClass}
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError("");
                  try {
                    await persistForm(form, "Feature image URL saved.");
                  } catch (err) {
                    setError(err?.data?.message || err?.message || "Unable to save.");
                  } finally {
                    setSaving(false);
                  }
                }}
                className={btnPrimaryClass}
              >
                Save image URL
              </button>
            </div>
            <div className="mt-2">
              <ImageUploadDropzone
                id={`website-content-${field.key}`}
                label=""
                value={uploadFiles[field.key]}
                onChange={(file) => handleImageUpload(field.key, file)}
                onError={setError}
                maxBytes={MAX_IMAGE_BYTES}
                accept="image/jpeg,image/png,image/jpg,image/webp"
                dropHint="Drop or tap to upload (max 500 KB)"
              />
              <p className="mt-0.5 text-[10px] leading-snug text-owner-muted md:text-xs">
                {field.recommendation}
              </p>
            </div>
            {(imagePreviews[field.key] || form[field.key]) && (
              <div className="mt-2 overflow-hidden rounded-md border border-owner-border bg-owner-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviews[field.key] || form[field.key]}
                  alt={`${field.label} preview`}
                  className="h-36 w-full object-cover sm:h-44 md:h-52"
                />
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
