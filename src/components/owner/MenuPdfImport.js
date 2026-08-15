"use client";

import { useMemo, useRef, useState } from "react";
import { importMenuDraft, parseMenuPdf } from "@/lib/api";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function toDraft(payload) {
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  return {
    categories: categories.map((cat, ci) => ({
      key: `c-${ci}`,
      included: true,
      name: String(cat?.name ?? ""),
      description: String(cat?.description ?? ""),
      items: (Array.isArray(cat?.items) ? cat.items : []).map((item, ii) => ({
        key: `c-${ci}-i-${ii}`,
        included: true,
        name: String(item?.name ?? ""),
        description: String(item?.description ?? ""),
        price: item?.price ?? "",
        is_vegetarian: !!item?.is_vegetarian,
        is_vegan: !!item?.is_vegan,
        is_gluten_free: !!item?.is_gluten_free,
        is_spicy: !!item?.is_spicy,
        variants: (Array.isArray(item?.variants) ? item.variants : []).map((v, vi) => ({
          key: `c-${ci}-i-${ii}-v-${vi}`,
          type_name: String(v?.type_name ?? ""),
          price: v?.price ?? "",
        })),
      })),
    })),
  };
}

function parsePrice(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function buildImportPayload(draft) {
  const categories = [];
  for (const cat of draft.categories) {
    if (!cat.included) continue;
    const name = String(cat.name ?? "").trim();
    if (!name) continue;
    const items = [];
    for (const item of cat.items) {
      if (!item.included) continue;
      const itemName = String(item.name ?? "").trim();
      if (!itemName) continue;
      const variants = [];
      for (const v of item.variants || []) {
        const typeName = String(v.type_name ?? "").trim();
        const price = parsePrice(v.price);
        if (!typeName && price === null) continue;
        if (!typeName || price === null) return { error: `Fix variants on “${itemName}”.` };
        variants.push({ type_name: typeName, price });
      }
      const price = parsePrice(item.price);
      if (price === null && variants.length === 0) {
        return { error: `Add a price for “${itemName}”.` };
      }
      items.push({
        name: itemName,
        description: String(item.description ?? "").trim(),
        price: price ?? variants[0].price,
        is_vegetarian: !!item.is_vegetarian,
        is_vegan: !!item.is_vegan,
        is_gluten_free: !!item.is_gluten_free,
        is_spicy: !!item.is_spicy,
        is_available: true,
        is_restaurant_only: false,
        variants,
      });
    }
    if (items.length === 0) continue;
    categories.push({
      name,
      description: String(cat.description ?? "").trim() || null,
      items,
    });
  }
  if (categories.length === 0) {
    return { error: "Select at least one item to import." };
  }
  return { draft: { categories } };
}

function FlagToggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-medium text-owner-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-owner-border" />
      {label}
    </label>
  );
}

export function MenuPdfImport({ token, restaurantId, menu, ensureMenu, onImported, showToast, fileInputRef }) {
  const innerInputRef = useRef(null);
  const requestIdRef = useRef(0);
  const inputRef = fileInputRef || innerInputRef;
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [fileName, setFileName] = useState("");

  const includedCount = useMemo(() => {
    if (!draft) return 0;
    return draft.categories.reduce(
      (sum, cat) => sum + (cat.included ? cat.items.filter((i) => i.included).length : 0),
      0
    );
  }, [draft]);

  const closePreview = () => {
    if (parsing || importing) return;
    setDraft(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file) => {
    if (!file || !token || !restaurantId) return;
    if (file.type && file.type !== "application/pdf") {
      showToast("Please choose a PDF file.", "error");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      showToast("PDF must be 10 MB or smaller.", "error");
      return;
    }
    setParsing(true);
    setDraft(null);
    setFileName(file.name);
    const requestId = ++requestIdRef.current;
    try {
      const res = await parseMenuPdf(token, restaurantId, file);
      if (requestId !== requestIdRef.current) return;
      const next = toDraft(res);
      if (next.categories.length === 0) {
        showToast("No dishes were found in that PDF.", "error");
        setFileName("");
        return;
      }
      setDraft(next);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      showToast(err?.data?.message || err?.message || "Failed to read PDF", "error");
      setFileName("");
    } finally {
      if (requestId === requestIdRef.current) {
        setParsing(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    }
  };

  const updateCategory = (key, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        categories: prev.categories.map((cat) => (cat.key === key ? { ...cat, ...patch } : cat)),
      };
    });
  };

  const updateItem = (catKey, itemKey, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        categories: prev.categories.map((cat) =>
          cat.key !== catKey
            ? cat
            : {
                ...cat,
                items: cat.items.map((item) => (item.key === itemKey ? { ...item, ...patch } : item)),
              }
        ),
      };
    });
  };

  const updateVariant = (catKey, itemKey, variantKey, patch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        categories: prev.categories.map((cat) =>
          cat.key !== catKey
            ? cat
            : {
                ...cat,
                items: cat.items.map((item) =>
                  item.key !== itemKey
                    ? item
                    : {
                        ...item,
                        variants: item.variants.map((v) => (v.key === variantKey ? { ...v, ...patch } : v)),
                      }
                ),
              }
        ),
      };
    });
  };

  const handleImport = async () => {
    if (!draft) return;
    const built = buildImportPayload(draft);
    if (built.error) {
      showToast(built.error, "error");
      return;
    }
    setImporting(true);
    try {
      let menuId = menu?.id;
      if (!menuId) {
        const firstCat = built.draft.categories[0]?.name || "Menu";
        const created = await ensureMenu?.(firstCat);
        menuId = created?.id;
      }
      if (!menuId) {
        throw new Error("Create a menu first, then import.");
      }
      const res = await importMenuDraft(token, menuId, built.draft);
      showToast(res?.message || "Menu imported.", "success");
      setDraft(null);
      setFileName("");
      onImported?.(res);
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to import menu", "error");
    } finally {
      setImporting(false);
    }
  };

  const busy = parsing || importing;
  const showModal = parsing || !!draft;

  return (
    <>
      <input
        ref={inputRef}
        id="menu-pdf-file"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="rounded-lg border border-owner-border bg-owner-paper px-3 py-3 md:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-owner-charcoal">Import from PDF</p>
            <p className="mt-0.5 text-xs text-owner-muted">
              {menu?.name
                ? `Add dishes to ${menu.name} from a PDF. You can edit names and prices before saving.`
                : "This restaurant has no menu yet. Import a PDF to create one, then edit names and prices before saving."}
            </p>
          </div>
          <label
            htmlFor="menu-pdf-file"
            className={`touch-manipulation inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-owner-action px-4 text-sm font-semibold !text-white hover:opacity-90 sm:h-10 ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {parsing ? "Reading PDF…" : "Choose PDF"}
          </label>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end pb-[calc(4rem+3.75rem+env(safe-area-inset-bottom,0px))] md:items-center md:justify-center md:p-6 md:pb-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-pdf-import-title"
        >
          <button
            type="button"
            className="owner-animate-modal-backdrop absolute inset-0 bg-black/45 backdrop-blur-[1px] md:p-0"
            aria-label="Close"
            disabled={busy}
            onClick={closePreview}
          />
          <div className="owner-animate-modal-sheet relative mt-auto flex max-h-[min(92dvh,calc(100vh-1rem))] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-owner-border bg-owner-card shadow-2xl md:mt-0 md:rounded-xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-owner-border px-4 py-3">
              <div className="min-w-0">
                <h2 id="menu-pdf-import-title" className="text-base font-semibold text-owner-charcoal">
                  {parsing ? "Reading menu PDF" : "Review imported menu"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-owner-muted">
                  {parsing
                    ? "This can take up to a minute."
                    : `${fileName || "PDF"} → ${menu?.name}. Uncheck rows to skip.`}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                disabled={busy}
                className="touch-manipulation shrink-0 rounded-lg border border-owner-border px-3 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {parsing && (
                <p className="text-sm text-owner-muted">Extracting categories and prices…</p>
              )}
              {draft && (
                <div className="space-y-4">
                  {draft.categories.map((cat) => (
                    <section key={cat.key} className="rounded-lg border border-owner-border p-3">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-2.5"
                          checked={cat.included}
                          onChange={(e) => updateCategory(cat.key, { included: e.target.checked })}
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(cat.key, { name: e.target.value })}
                            className="w-full rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-sm font-semibold text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                            aria-label="Category name"
                          />
                          <input
                            type="text"
                            value={cat.description}
                            onChange={(e) => updateCategory(cat.key, { description: e.target.value })}
                            placeholder="Category description (optional)"
                            className="w-full rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-xs text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                          />
                        </div>
                      </div>
                      <ul className={`mt-3 space-y-2 ${cat.included ? "" : "pointer-events-none opacity-45"}`}>
                        {cat.items.map((item) => (
                          <li key={item.key} className="rounded-md bg-owner-paper p-2.5">
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-2"
                                checked={item.included}
                                onChange={(e) => updateItem(cat.key, item.key, { included: e.target.checked })}
                              />
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex flex-col gap-1.5 sm:flex-row">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItem(cat.key, item.key, { name: e.target.value })}
                                    className="min-w-0 flex-1 rounded-md border border-owner-border bg-owner-card px-2 py-1.5 text-sm text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                                    aria-label="Item name"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => updateItem(cat.key, item.key, { price: e.target.value })}
                                    className="w-full rounded-md border border-owner-border bg-owner-card px-2 py-1.5 text-sm text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action sm:w-24"
                                    aria-label="Price"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateItem(cat.key, item.key, { description: e.target.value })}
                                  placeholder="Description (optional)"
                                  className="w-full rounded-md border border-owner-border bg-owner-card px-2 py-1.5 text-xs text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                                />
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  <FlagToggle
                                    label="Veg"
                                    checked={item.is_vegetarian}
                                    onChange={(v) => updateItem(cat.key, item.key, { is_vegetarian: v })}
                                  />
                                  <FlagToggle
                                    label="Vegan"
                                    checked={item.is_vegan}
                                    onChange={(v) => updateItem(cat.key, item.key, { is_vegan: v })}
                                  />
                                  <FlagToggle
                                    label="GF"
                                    checked={item.is_gluten_free}
                                    onChange={(v) => updateItem(cat.key, item.key, { is_gluten_free: v })}
                                  />
                                  <FlagToggle
                                    label="Spicy"
                                    checked={item.is_spicy}
                                    onChange={(v) => updateItem(cat.key, item.key, { is_spicy: v })}
                                  />
                                </div>
                                {item.variants.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-owner-muted">Variants</p>
                                    {item.variants.map((v) => (
                                      <div key={v.key} className="flex gap-1.5">
                                        <input
                                          type="text"
                                          value={v.type_name}
                                          onChange={(e) =>
                                            updateVariant(cat.key, item.key, v.key, { type_name: e.target.value })
                                          }
                                          className="min-w-0 flex-1 rounded-md border border-owner-border bg-owner-card px-2 py-1 text-xs text-owner-charcoal"
                                          aria-label="Variant name"
                                        />
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={v.price}
                                          onChange={(e) =>
                                            updateVariant(cat.key, item.key, v.key, { price: e.target.value })
                                          }
                                          className="w-20 rounded-md border border-owner-border bg-owner-card px-2 py-1 text-xs text-owner-charcoal"
                                          aria-label="Variant price"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>

            {draft && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-owner-border px-4 py-3">
                <button
                  type="button"
                  onClick={closePreview}
                  disabled={busy}
                  className="touch-manipulation rounded-lg px-3 py-2 text-sm font-medium text-owner-muted hover:text-owner-charcoal disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={busy || includedCount === 0}
                  className="touch-manipulation rounded-lg bg-owner-action px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {importing ? "Adding…" : `Add to menu (${includedCount})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
