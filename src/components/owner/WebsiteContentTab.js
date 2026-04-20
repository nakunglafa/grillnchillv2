"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageUploadDropzone, MAX_IMAGE_BYTES } from "@/components/owner/ImageUploadDropzone";
import websiteContentDefaults from "@/data/website-content.json";
import {
  getOwnerWebsiteContent,
  updateOwnerWebsiteContent,
  uploadOwnerWebsiteContentImage,
} from "@/lib/api";

const IMAGE_GROUPS = [
  {
    id: "hero-story",
    title: "Hero and story",
    description: "Main homepage visual collage.",
    fields: [
      {
        key: "heroMainImage",
        label: "Hero main image",
        recommendation: "Recommended 1600x1200. Max 500 KB.",
      },
      {
        key: "heroSideImage",
        label: "Hero side image",
        recommendation: "Recommended 900x900. Max 500 KB.",
      },
    ],
  },
  {
    id: "parallax",
    title: "Parallax backgrounds",
    description: "Background strips used across homepage sections.",
    fields: [
      {
        key: "parallaxQualityBg",
        label: "Parallax quality background",
        recommendation: "Recommended 1920x1080. Max 500 KB.",
      },
      {
        key: "parallaxTestimonialsBg",
        label: "Parallax testimonials background",
        recommendation: "Recommended 1920x1080. Max 500 KB.",
      },
      {
        key: "parallaxReserveBg",
        label: "Parallax reserve background",
        recommendation: "Recommended 1920x1080. Max 500 KB.",
      },
    ],
  },
  {
    id: "thai-showcase",
    title: "Thai section images",
    description: "Split-layout photos for Thai section.",
    fields: [
      {
        key: "thaiImageMain",
        label: "Thai section image (main)",
        recommendation: "Recommended 1400x900. Max 500 KB.",
      },
      {
        key: "thaiImageSecondary",
        label: "Thai section image (secondary)",
        recommendation: "Recommended 900x600. Max 500 KB.",
      },
      {
        key: "thaiImageTertiary",
        label: "Thai section image (third)",
        recommendation: "Recommended 900x600. Max 500 KB.",
      },
    ],
  },
  {
    id: "sushi-showcase",
    title: "Sushi section images",
    description: "Split-layout photos for Sushi section.",
    fields: [
      {
        key: "sushiImageMain",
        label: "Sushi section image (main)",
        recommendation: "Recommended 1400x900. Max 500 KB.",
      },
      {
        key: "sushiImageSecondary",
        label: "Sushi section image (secondary)",
        recommendation: "Recommended 900x600. Max 500 KB.",
      },
      {
        key: "sushiImageTertiary",
        label: "Sushi section image (third)",
        recommendation: "Recommended 900x600. Max 500 KB.",
      },
    ],
  },
  {
    id: "our-menus-cards",
    title: "Our Menus cards",
    description: "Images for Thai, Sushi and Dessert cards.",
    fields: [
      {
        key: "menuShowcaseThaiImage",
        label: "Our Menus card - Thai image",
        recommendation: "Recommended 900x900. Max 500 KB.",
      },
      {
        key: "menuShowcaseSushiImage",
        label: "Our Menus card - Sushi image",
        recommendation: "Recommended 900x900. Max 500 KB.",
      },
      {
        key: "menuShowcaseDessertImage",
        label: "Our Menus card - Dessert image",
        recommendation: "Recommended 900x900. Max 500 KB.",
      },
    ],
  },
];

const IMAGE_FIELDS = IMAGE_GROUPS.flatMap((group) => group.fields);

const DEFAULT_FORM = {
  storyTitle: "",
  storyText: "",
  thaiSectionTitle: "Thai Menu",
  thaiSectionIntro: "",
  sushiSectionTitle: "Sushi Menu",
  sushiSectionIntro: "",
  heroMainImage: "",
  heroSideImage: "",
  parallaxQualityBg: "",
  parallaxTestimonialsBg: "",
  parallaxReserveBg: "",
  thaiImageMain: "",
  thaiImageSecondary: "",
  thaiImageTertiary: "",
  sushiImageMain: "",
  sushiImageSecondary: "",
  sushiImageTertiary: "",
  menuShowcaseEyebrow: "Menus",
  menuShowcaseTitle: "Our Menus",
  menuShowcaseIntro: "Explore Thai favorites, fresh sushi, and house desserts from our live menu.",
  menuShowcaseThaiTitle: "Thai",
  menuShowcaseThaiSubtext: "Curries / Noodles / Stir-fry",
  menuShowcaseThaiImage: "",
  menuShowcaseSushiTitle: "Sushi",
  menuShowcaseSushiSubtext: "Maki / Nigiri / Sashimi",
  menuShowcaseSushiImage: "",
  menuShowcaseDessertTitle: "Dessert",
  menuShowcaseDessertSubtext: "Cake / Ice cream / Mochi",
  menuShowcaseDessertImage: "",
};

function apiToFormContent(content) {
  if (!content || typeof content !== "object") return {};
  return {
    storyTitle: content.story_title ?? content.storyTitle ?? "",
    storyText: content.story_text ?? content.storyText ?? "",
    thaiSectionTitle: content.thai_section_title ?? content.thaiSectionTitle ?? "",
    thaiSectionIntro: content.thai_section_intro ?? content.thaiSectionIntro ?? "",
    sushiSectionTitle: content.sushi_section_title ?? content.sushiSectionTitle ?? "",
    sushiSectionIntro: content.sushi_section_intro ?? content.sushiSectionIntro ?? "",
    heroMainImage: content.hero_main_image_url ?? content.heroMainImage ?? "",
    heroSideImage: content.hero_side_image_url ?? content.heroSideImage ?? "",
    parallaxQualityBg: content.parallax_quality_bg_url ?? content.parallaxQualityBg ?? "",
    parallaxTestimonialsBg:
      content.parallax_testimonials_bg_url ?? content.parallaxTestimonialsBg ?? "",
    parallaxReserveBg: content.parallax_reserve_bg_url ?? content.parallaxReserveBg ?? "",
    thaiImageMain: content.thai_image_main_url ?? content.thaiImageMain ?? "",
    thaiImageSecondary: content.thai_image_secondary_url ?? content.thaiImageSecondary ?? "",
    thaiImageTertiary: content.thai_image_tertiary_url ?? content.thaiImageTertiary ?? "",
    sushiImageMain: content.sushi_image_main_url ?? content.sushiImageMain ?? "",
    sushiImageSecondary: content.sushi_image_secondary_url ?? content.sushiImageSecondary ?? "",
    sushiImageTertiary: content.sushi_image_tertiary_url ?? content.sushiImageTertiary ?? "",
    menuShowcaseEyebrow: content.menu_showcase_eyebrow ?? content.menuShowcaseEyebrow ?? "",
    menuShowcaseTitle: content.menu_showcase_title ?? content.menuShowcaseTitle ?? "",
    menuShowcaseIntro: content.menu_showcase_intro ?? content.menuShowcaseIntro ?? "",
    menuShowcaseThaiTitle:
      content.menu_showcase_thai_title ?? content.menuShowcaseThaiTitle ?? "",
    menuShowcaseThaiSubtext:
      content.menu_showcase_thai_subtext ?? content.menuShowcaseThaiSubtext ?? "",
    menuShowcaseThaiImage:
      content.menu_showcase_thai_image_url ?? content.menuShowcaseThaiImage ?? "",
    menuShowcaseSushiTitle:
      content.menu_showcase_sushi_title ?? content.menuShowcaseSushiTitle ?? "",
    menuShowcaseSushiSubtext:
      content.menu_showcase_sushi_subtext ?? content.menuShowcaseSushiSubtext ?? "",
    menuShowcaseSushiImage:
      content.menu_showcase_sushi_image_url ?? content.menuShowcaseSushiImage ?? "",
    menuShowcaseDessertTitle:
      content.menu_showcase_dessert_title ?? content.menuShowcaseDessertTitle ?? "",
    menuShowcaseDessertSubtext:
      content.menu_showcase_dessert_subtext ?? content.menuShowcaseDessertSubtext ?? "",
    menuShowcaseDessertImage:
      content.menu_showcase_dessert_image_url ?? content.menuShowcaseDessertImage ?? "",
  };
}

function formToApiContent(form) {
  return {
    story_title: form.storyTitle || "",
    story_text: form.storyText || "",
    thai_section_title: form.thaiSectionTitle || "",
    thai_section_intro: form.thaiSectionIntro || "",
    sushi_section_title: form.sushiSectionTitle || "",
    sushi_section_intro: form.sushiSectionIntro || "",
    hero_main_image_url: form.heroMainImage || "",
    hero_side_image_url: form.heroSideImage || "",
    parallax_quality_bg_url: form.parallaxQualityBg || "",
    parallax_testimonials_bg_url: form.parallaxTestimonialsBg || "",
    parallax_reserve_bg_url: form.parallaxReserveBg || "",
    thai_image_main_url: form.thaiImageMain || "",
    thai_image_secondary_url: form.thaiImageSecondary || "",
    thai_image_tertiary_url: form.thaiImageTertiary || "",
    sushi_image_main_url: form.sushiImageMain || "",
    sushi_image_secondary_url: form.sushiImageSecondary || "",
    sushi_image_tertiary_url: form.sushiImageTertiary || "",
    menu_showcase_eyebrow: form.menuShowcaseEyebrow || "",
    menu_showcase_title: form.menuShowcaseTitle || "",
    menu_showcase_intro: form.menuShowcaseIntro || "",
    menu_showcase_thai_title: form.menuShowcaseThaiTitle || "",
    menu_showcase_thai_subtext: form.menuShowcaseThaiSubtext || "",
    menu_showcase_thai_image_url: form.menuShowcaseThaiImage || "",
    menu_showcase_sushi_title: form.menuShowcaseSushiTitle || "",
    menu_showcase_sushi_subtext: form.menuShowcaseSushiSubtext || "",
    menu_showcase_sushi_image_url: form.menuShowcaseSushiImage || "",
    menu_showcase_dessert_title: form.menuShowcaseDessertTitle || "",
    menu_showcase_dessert_subtext: form.menuShowcaseDessertSubtext || "",
    menu_showcase_dessert_image_url: form.menuShowcaseDessertImage || "",
  };
}

export function WebsiteContentTab({ restaurantId, token }) {
  const [form, setForm] = useState(DEFAULT_FORM);
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
    return { ...fallback, ...specific };
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
          setForm({ ...DEFAULT_FORM, ...defaultFromFile, ...apiToFormContent(saved) });
        } else {
          setForm({ ...DEFAULT_FORM, ...defaultFromFile });
        }
      } catch {
        if (cancelled) return;
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
    if (!token) throw new Error("You must be logged in to save website content.");
    const res = await updateOwnerWebsiteContent(token, restaurantContentId, formToApiContent(nextForm));
    const message = successMessage || res?.message || res?.data?.message || "Website content saved.";
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
      const imageUrl = uploadRes?.full_url ?? uploadRes?.url ?? uploadRes?.data?.full_url ?? uploadRes?.data?.url;
      if (!imageUrl) throw new Error("Upload succeeded but no image URL was returned.");
      const field = IMAGE_FIELDS.find((f) => f.key === key);
      let nextForm;
      setForm((prev) => {
        nextForm = { ...prev, [key]: imageUrl };
        return nextForm;
      });
      setUploadFiles((prev) => ({ ...prev, [key]: file }));
      await persistForm(
        nextForm,
        `${field?.label || "Image"} updated and saved to database.`
      );
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
      await persistForm(form, "Website content saved to database.");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to save website content.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_FORM, ...defaultFromFile });
    setUploadFiles({});
    setError("");
    setSuccess("");
    setLastServerUpdate(null);
    setSuccess("Website content reset in form. Click Save to persist.");
  };

  const handleExportJson = () => {
    try {
      const payload = { [restaurantContentId]: form };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `website-content-${restaurantContentId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess("Exported JSON file. Merge it into src/data/website-content.json.");
    } catch {
      setError("Failed to export JSON.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-owner-border bg-owner-card px-4 py-3 text-base md:text-sm text-owner-charcoal placeholder:text-owner-muted sm:rounded-lg sm:py-2 sm:text-sm";
  const labelClass = "block text-sm md:text-xs font-medium text-owner-charcoal mb-1";
  const sectionClass = "owner-card rounded-xl p-6 border border-owner-border";
  const btnPrimaryClass =
    "touch-manipulation min-h-[48px] rounded-xl bg-owner-action px-5 py-3 text-base md:text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:rounded-lg sm:py-2 sm:text-sm";

  if (loadingSaved) {
    return (
      <div className="rounded-xl border border-owner-border bg-owner-card p-6">
        <p className="text-owner-muted">Loading website content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || success) && (
        <div className="space-y-2">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="rounded-lg border border-owner-success/40 bg-white p-3 text-sm text-owner-success">
              {success}
            </p>
          )}
          {lastServerUpdate?.at && (
            <p className="rounded-lg border border-owner-border bg-owner-paper p-3 text-xs text-owner-muted">
              Last server update: {new Date(lastServerUpdate.at).toLocaleString()}.
            </p>
          )}
        </div>
      )}

      <section className={sectionClass}>
        <h3 className="mb-3 text-lg md:text-base font-semibold text-owner-charcoal">Story content</h3>
        <p className="mb-4 text-sm text-owner-muted">
          Control homepage story text and section headings. Leave blank to use default content.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <label>
            <span className={labelClass}>Story heading</span>
            <input
              type="text"
              value={form.storyTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, storyTitle: e.target.value }))}
              className={inputClass}
              placeholder="The story"
            />
          </label>
          <label>
            <span className={labelClass}>Story paragraph</span>
            <textarea
              value={form.storyText}
              onChange={(e) => setForm((prev) => ({ ...prev, storyText: e.target.value }))}
              rows={4}
              className={inputClass}
              placeholder="Write your brand story..."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Thai section title</span>
              <input
                type="text"
                value={form.thaiSectionTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, thaiSectionTitle: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Sushi section title</span>
              <input
                type="text"
                value={form.sushiSectionTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, sushiSectionTitle: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Thai section intro (optional)</span>
              <textarea
                value={form.thaiSectionIntro}
                onChange={(e) => setForm((prev) => ({ ...prev, thaiSectionIntro: e.target.value }))}
                rows={3}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Sushi section intro (optional)</span>
              <textarea
                value={form.sushiSectionIntro}
                onChange={(e) => setForm((prev) => ({ ...prev, sushiSectionIntro: e.target.value }))}
                rows={3}
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save website content"}
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="touch-manipulation min-h-[48px] rounded-xl border border-owner-border px-5 py-3 text-base md:text-sm font-medium text-owner-charcoal hover:bg-owner-paper sm:rounded-lg sm:py-2 sm:text-sm"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="touch-manipulation min-h-[48px] rounded-xl border border-owner-border px-5 py-3 text-base md:text-sm font-medium text-owner-charcoal hover:bg-owner-paper sm:rounded-lg sm:py-2 sm:text-sm"
            >
              Reset to defaults
            </button>
          </div>
        </form>
      </section>

      <section className={sectionClass}>
        <h3 className="mb-3 text-lg md:text-base font-semibold text-owner-charcoal">Our Menus cards area</h3>
        <p className="mb-4 text-sm text-owner-muted">
          Control the heading, intro, and card details for the homepage &quot;Our Menus&quot; block.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClass}>Section eyebrow</span>
            <input
              type="text"
              value={form.menuShowcaseEyebrow}
              onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseEyebrow: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>Section title</span>
            <input
              type="text"
              value={form.menuShowcaseTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseTitle: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="md:col-span-2">
            <span className={labelClass}>Section intro text</span>
            <textarea
              value={form.menuShowcaseIntro}
              onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseIntro: e.target.value }))}
              rows={3}
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-owner-border p-4">
            <h4 className="mb-3 text-sm font-semibold text-owner-charcoal">Thai card</h4>
            <label>
              <span className={labelClass}>Title</span>
              <input
                type="text"
                value={form.menuShowcaseThaiTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseThaiTitle: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>Subtext</span>
              <input
                type="text"
                value={form.menuShowcaseThaiSubtext}
                onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseThaiSubtext: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <div className="rounded-lg border border-owner-border p-4">
            <h4 className="mb-3 text-sm font-semibold text-owner-charcoal">Sushi card</h4>
            <label>
              <span className={labelClass}>Title</span>
              <input
                type="text"
                value={form.menuShowcaseSushiTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseSushiTitle: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>Subtext</span>
              <input
                type="text"
                value={form.menuShowcaseSushiSubtext}
                onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseSushiSubtext: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <div className="rounded-lg border border-owner-border p-4">
            <h4 className="mb-3 text-sm font-semibold text-owner-charcoal">Dessert card</h4>
            <label>
              <span className={labelClass}>Title</span>
              <input
                type="text"
                value={form.menuShowcaseDessertTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, menuShowcaseDessertTitle: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block">
              <span className={labelClass}>Subtext</span>
              <input
                type="text"
                value={form.menuShowcaseDessertSubtext}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, menuShowcaseDessertSubtext: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="mb-3 text-lg md:text-base font-semibold text-owner-charcoal">Images control</h3>
        <p className="mb-4 text-sm text-owner-muted">
          Upload images or paste URLs. Uploaded images are stored on server and auto-saved to DB.
        </p>

        <div className="grid gap-6 xl:grid-cols-2">
          {IMAGE_GROUPS.map((group) => (
            <div key={group.id} className="rounded-lg border border-owner-border p-4">
              <h4 className="text-sm font-semibold text-owner-charcoal">{group.title}</h4>
              <p className="mt-1 text-xs text-owner-muted">{group.description}</p>
              <div className="mt-4 grid gap-5">
                {group.fields.map((field) => (
                  <div key={field.key} className="rounded-lg border border-owner-border/70 p-3">
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
                    <div className="mt-3">
                      <ImageUploadDropzone
                        id={`website-content-${field.key}`}
                        label=""
                        value={uploadFiles[field.key]}
                        onChange={(file) => handleImageUpload(field.key, file)}
                        onError={setError}
                        maxBytes={MAX_IMAGE_BYTES}
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        dropHint="Drop image or click to choose (max 500 KB)"
                      />
                      <p className="mt-1 text-xs text-owner-muted">{field.recommendation}</p>
                    </div>
                    {(imagePreviews[field.key] || form[field.key]) && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-owner-border bg-owner-paper">
                        <img
                          src={imagePreviews[field.key] || form[field.key]}
                          alt={`${field.label} preview`}
                          className="h-40 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

