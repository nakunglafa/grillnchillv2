"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getMenusForRestaurant,
  updateMenu,
  deleteMenu,
  createMenuForRestaurant,
  getCategoriesForMenu,
  createCategoryForMenu,
  updateCategory,
  deleteCategory,
  getItemsForCategory,
  createItemForCategory,
  updateItem,
  deleteItem,
  deleteItemImage,
  deleteCategoryImage,
  reorderMenuCategories,
  reorderCategoryItems,
} from "@/lib/api";
import { toArray } from "@/lib/owner-utils";
import { Toast } from "@/components/Toast";
import { ImageUploadDropzone, MAX_MENU_IMAGE_BYTES } from "@/components/owner/ImageUploadDropzone";
import { MenuPdfImport } from "@/components/owner/MenuPdfImport";

/** Stable preview URL for a File; revokes on change/unmount. */
function FilePreviewImage({ file, alt = "", className = "" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!(file instanceof File)) {
      setSrc("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}

/** Flatten API categories when they come as main[] with nested .children so all categories are in one list and findable by id. */
function flattenCategories(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const c of arr) {
    out.push({ ...c, children: undefined });
    if (Array.isArray(c.children) && c.children.length > 0) {
      for (const sub of c.children) out.push({ ...sub });
    }
  }
  return out;
}

function sortByOrder(a, b) {
  const ao = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
  const bo = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return Number(a?.id || 0) - Number(b?.id || 0);
}

/**
 * 1-based new_sort_order for reorder API after dragging an item from fromIndex onto dropTargetIndex.
 * insertAfter: pointer on lower half of target row → insert after that item.
 */
function computeNewItemSortOrder(itemIds, fromIndex, dropTargetIndex, insertAfter) {
  const n = itemIds.length;
  if (n === 0 || fromIndex < 0 || fromIndex >= n || dropTargetIndex < 0 || dropTargetIndex >= n) {
    return null;
  }
  const list = itemIds.slice();
  const [moved] = list.splice(fromIndex, 1);
  let ins = dropTargetIndex + (insertAfter ? 1 : 0);
  if (fromIndex < dropTargetIndex) ins -= 1;
  list.splice(ins, 0, moved);
  return list.indexOf(moved) + 1;
}

function parseVariantsDraft(variants) {
  if (!Array.isArray(variants)) return { hasAnyInput: false, invalid: false, payload: [] };
  let hasAnyInput = false;
  const payload = [];
  for (const v of variants) {
    const typeName = String(v?.type_name ?? "").trim();
    const rawPrice = v?.price;
    const hasType = typeName.length > 0;
    const hasPrice = rawPrice !== "" && rawPrice !== null && rawPrice !== undefined;
    if (hasType || hasPrice) hasAnyInput = true;
    if (!hasType && !hasPrice) continue;
    const price = parseFloat(rawPrice);
    if (!hasType || !Number.isFinite(price) || price < 0) {
      return { hasAnyInput: true, invalid: true, payload: [] };
    }
    payload.push({
      type_name: typeName,
      price,
      sort_order: payload.length + 1,
      is_available: v?.is_available !== false,
    });
  }
  return { hasAnyInput, invalid: false, payload };
}

function appendVariantsToFormData(fd, variants) {
  variants.forEach((variant, idx) => {
    fd.append(`variants[${idx}][type_name]`, variant.type_name);
    fd.append(`variants[${idx}][price]`, String(variant.price));
    fd.append(`variants[${idx}][sort_order]`, String(variant.sort_order));
    fd.append(`variants[${idx}][is_available]`, variant.is_available !== false ? "1" : "0");
  });
}

function toVariantDrafts(variants) {
  if (!Array.isArray(variants)) return [];
  return [...variants]
    .sort(sortByOrder)
    .map((v) => ({
      type_name: v?.type_name ?? "",
      price: v?.price ?? "",
      is_available: v?.is_available !== false,
    }));
}

function getItemPriceLabel(item) {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  if (variants.length > 0) {
    const prices = variants
      .map((v) => parseFloat(v?.price))
      .filter((p) => Number.isFinite(p) && p >= 0);
    if (prices.length > 0) return `From ${Math.min(...prices).toFixed(2)}`;
    return `${variants.length} variants`;
  }
  const price = parseFloat(item?.price);
  return Number.isFinite(price) ? price.toFixed(2) : item?.price ?? "-";
}

/** Space reserved for owner mobile bottom nav (dashboard nav: py-2 top + h-14 row + safe-area bottom). */
const OWNER_MOBILE_NAV_BOTTOM = "calc(4rem + env(safe-area-inset-bottom, 0px))";
/** Bottom padding for sheets: clears main nav + Menu tab select/+ toolbar. */
const OWNER_MENU_SHEET_ABOVE_NAV = "calc(4rem + 3.75rem + env(safe-area-inset-bottom, 0px))";

/** Mobile bottom-sheet modal frame (owner dashboard). Sheet sits above main nav + menu toolbar. */
function MenuMobileModal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
      style={{ paddingBottom: OWNER_MENU_SHEET_ABOVE_NAV }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-mobile-modal-title"
    >
      <button
        type="button"
        className="owner-animate-modal-backdrop absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="owner-animate-modal-sheet relative mt-auto flex max-h-[min(92dvh,calc(100vh-1rem))] w-full flex-col overflow-hidden rounded-t-2xl border border-owner-border bg-owner-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-owner-border px-4 py-3">
          <h2 id="menu-mobile-modal-title" className="min-w-0 truncate text-base font-semibold text-owner-charcoal">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation shrink-0 rounded-lg border border-owner-border px-3 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-paper"
          >
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MenuTab({ restaurantId, token }) {
  const [menus, setMenus] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menusListRefreshing, setMenusListRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("error");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [itemsRefreshTrigger, setItemsRefreshTrigger] = useState(0);
  const [categoriesRefreshTrigger, setCategoriesRefreshTrigger] = useState(0);
  const [imageCacheBust, setImageCacheBust] = useState(0);
  const [selectedMenuCategories, setSelectedMenuCategories] = useState([]);
  const [openMainCatForm, setOpenMainCatForm] = useState(false);
  const [openSubCatForm, setOpenSubCatForm] = useState(false);
  /** Mobile: null | 'picker' | 'select-menu' | 'main-category' | 'sub-category' */
  const [mobileSheet, setMobileSheet] = useState(null);
  const pdfFileInputRef = useRef(null);

  const showToast = useCallback((message, type = "error") => {
    setToastMessage(message);
    setToastType(type);
  }, []);

  const loadMenus = useCallback((opts = {}) => {
    const soft = opts.soft === true;
    if (!restaurantId || !token) return;
    if (soft) setMenusListRefreshing(true);
    else setLoading(true);
    setError("");
    getMenusForRestaurant(token, restaurantId)
      .then((res) => {
        const list = toArray(res);
        setMenus(list);
        // Initialize selected menu if none is selected yet
        setSelectedMenuId((prev) => prev ?? (list[0]?.id ?? null));
        setImageCacheBust((t) => t + 1);
      })
      .catch((err) => {
        setError(err?.data?.message || err?.message || "Failed to load menus");
        setMenus([]);
        showToast(err?.data?.message || err?.message || "Failed to load menus", "error");
      })
      .finally(() => {
        setLoading(false);
        setMenusListRefreshing(false);
      });
  }, [restaurantId, token, showToast]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  // Load categories for the selected menu so the left sidebar can add main/sub categories
  useEffect(() => {
    if (!selectedMenuId || !token) return;
    (async () => {
      try {
        const res = await getCategoriesForMenu(token, selectedMenuId);
        setSelectedMenuCategories(toArray(res));
      } catch {
        setSelectedMenuCategories([]);
      }
    })();
  }, [selectedMenuId, token, categoriesRefreshTrigger]);

  const loadCategories = useCallback(
    async (menuId) => {
      if (!token) return [];
      const res = await getCategoriesForMenu(token, menuId);
      return toArray(res);
    },
    [token]
  );

  const loadItems = useCallback(
    async (categoryId) => {
      if (!token) return [];
      const res = await getItemsForCategory(token, categoryId);
      const arr = toArray(res);
      return Array.isArray(arr) ? [...arr].sort(sortByOrder) : [];
    },
    [token]
  );

  const ensureMenuForImport = useCallback(
    async (suggestedName) => {
      if (selectedMenuId) {
        const existing = menus.find((m) => String(m.id) === String(selectedMenuId));
        if (existing?.id) return existing;
      }
      const name = String(suggestedName || "Menu").trim() || "Menu";
      const res = await createMenuForRestaurant(token, restaurantId, {
        name,
        is_active: true,
      });
      const created = res?.data ?? res;
      const menu = created?.id ? created : created?.data;
      if (!menu?.id) throw new Error("Failed to create a menu for this import.");
      setMenus((prev) => [menu, ...prev.filter((m) => String(m.id) !== String(menu.id))]);
      setSelectedMenuId(menu.id);
      return menu;
    },
    [menus, restaurantId, selectedMenuId, token]
  );

  const handleUpdateMenu = async (menu) => {
    const name = (formData[`menu-${menu.id}`] ?? menu.name)?.trim();
    if (!name) return;
    try {
      await updateMenu(token, menu.id, { name });
      setEditing(null);
      loadMenus({ soft: true });
      showToast("Menu updated.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to update menu", "error");
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!confirm("Delete this menu and all its categories/items?")) return;
    try {
      await deleteMenu(token, menuId);
      loadMenus({ soft: true });
      showToast("Menu deleted.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to delete menu", "error");
    }
  };

  const handleCreateCategory = async (menuId, type = "main") => {
    const key = type === "main" ? `cat-main-${menuId}` : `cat-sub-${menuId}`;
    const data = formData[key] ?? {};
    const name = (typeof data === "string" ? data : data.name)?.trim();
    if (!name) {
      showToast("Category name is required.", "error");
      return;
    }
    const parentId = type === "main" ? null : (typeof data === "object" ? data.parent_id : null);
    if (type === "sub" && !parentId) {
      showToast("Please select a parent category for the sub-category.", "error");
      return;
    }
    try {
      const imageFile = typeof data === "object" ? data._imageFile : null;
      const description = typeof data === "object" ? (data.description || "") : "";
      const sortOrder = typeof data === "object" ? (data.sort_order ?? "") : "";

      if (imageFile instanceof File && imageFile.size > 0) {
        const fd = new FormData();
        fd.append("name", name);
        fd.append("description", description);
        if (sortOrder !== "" && sortOrder !== undefined) fd.append("sort_order", String(sortOrder));
        if (parentId) fd.append("parent_id", String(parentId));
        fd.append("image", imageFile, imageFile.name || "image.jpg");
        fd.append("data[image]", imageFile, imageFile.name || "image.jpg");
        await createCategoryForMenu(token, menuId, fd);
      } else {
        await createCategoryForMenu(token, menuId, {
          name,
          description,
          ...(sortOrder !== "" && sortOrder !== undefined && { sort_order: Number(sortOrder) }),
          ...(parentId && { parent_id: Number(parentId) }),
        });
      }
      setError("");
      setFormData((p) => ({ ...p, [key]: {} }));
      setCategoriesRefreshTrigger((t) => t + 1);
      showToast("Category created.", "success");
      setOpenMainCatForm(false);
      setOpenSubCatForm(false);
      setMobileSheet(null);
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to create category", "error");
    }
  };

  const handleUpdateCategory = async (category, imageFile = null) => {
    const data = formData[`edit-cat-${category.id}`] ?? category;
    const name = (data.name ?? category.name)?.trim();
    if (!name) {
      showToast("Category name is required.", "error");
      return;
    }
    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        if (category.image_url) {
          try {
            await deleteCategoryImage(token, category.id);
          } catch (delErr) {
            // Continue with upload if backend already replaces; surface soft warning only when delete fails hard.
            console.warn("Could not delete previous category image:", delErr?.message || delErr);
          }
        }
        const fd = new FormData();
        fd.append("_method", "PATCH");
        fd.append("name", name);
        fd.append("description", data.description ?? category.description ?? "");
        fd.append("sort_order", String(data.sort_order ?? category.sort_order ?? 0));
        if (data.parent_id !== undefined) fd.append("parent_id", data.parent_id ? String(data.parent_id) : "");
        fd.append("image", imageFile, imageFile.name || "image.jpg");
        fd.append("data[image]", imageFile, imageFile.name || "image.jpg");
        await updateCategory(token, category.id, fd);
      } else {
        await updateCategory(token, category.id, {
          name,
          description: data.description ?? category.description ?? "",
          sort_order: Number(data.sort_order ?? category.sort_order ?? 0),
          ...(data.parent_id !== undefined && { parent_id: data.parent_id || null }),
        });
      }
      setEditing(null);
      setCategoriesRefreshTrigger((t) => t + 1);
      showToast("Category updated.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to update category", "error");
    }
  };

  const handleMoveCategory = async (categoryId, newParentId, newSortOrder) => {
    try {
      await updateCategory(token, categoryId, {
        parent_id: newParentId || null,
        ...(newSortOrder !== undefined && { sort_order: newSortOrder }),
      });
      setCategoriesRefreshTrigger((t) => t + 1);
      showToast("Category moved.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to move category", "error");
    }
  };

  const handleReorderCategory = async (menuId, categoryId, newSortOrder, parentId = null) => {
    try {
      await reorderMenuCategories(token, menuId, {
        category_id: categoryId,
        new_sort_order: newSortOrder,
        ...(parentId ? { parent_id: parentId } : {}),
      });
      setCategoriesRefreshTrigger((t) => t + 1);
      showToast("Category order updated.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to reorder category", "error");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Delete this category and all its sub-categories and items?")) return;
    try {
      await deleteCategory(token, categoryId);
      setCategoriesRefreshTrigger((t) => t + 1);
      showToast("Category deleted.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to delete category", "error");
    }
  };

  const handleCreateItem = async (categoryId, e) => {
    e.preventDefault();
    const data = formData[`item-${categoryId}`];
    if (!data?.name?.trim()) {
      showToast("Item name is required.", "error");
      throw new Error("validation");
    }
    const parsedVariants = parseVariantsDraft(data?.variants);
    if (parsedVariants.invalid) {
      showToast("Each variant needs a type and a valid price (0 or greater).", "error");
      throw new Error("validation");
    }
    const hasPriceInput = data?.price !== undefined && data?.price !== null && data?.price !== "";
    const price = parseFloat(data?.price);
    const hasValidPrice = hasPriceInput && Number.isFinite(price) && price >= 0;
    if (hasPriceInput && !hasValidPrice) {
      showToast("Price must be 0 or greater.", "error");
      throw new Error("validation");
    }
    if (!hasValidPrice && parsedVariants.payload.length === 0) {
      showToast("Add a base price or at least one valid variant.", "error");
      throw new Error("validation");
    }
    try {
      const imageFile = data._imageFile;
      if (imageFile instanceof File && imageFile.size > 0) {
        const fd = new FormData();
        fd.append("name", data.name.trim());
        fd.append("description", data.description || "");
        if (hasValidPrice) fd.append("price", String(price));
        fd.append("is_available", data.is_available !== false ? "1" : "0");
        fd.append("is_gluten_free", data.is_gluten_free ? "1" : "0");
        fd.append("is_vegan", data.is_vegan ? "1" : "0");
        fd.append("is_vegetarian", data.is_vegetarian ? "1" : "0");
        fd.append("is_spicy", data.is_spicy ? "1" : "0");
        if (parsedVariants.payload.length > 0) appendVariantsToFormData(fd, parsedVariants.payload);
        fd.append("image", imageFile, imageFile.name || "image.jpg");
        fd.append("data[image]", imageFile, imageFile.name || "image.jpg");
        await createItemForCategory(token, categoryId, fd);
      } else {
        await createItemForCategory(token, categoryId, {
          name: data.name.trim(),
          description: data.description || "",
          ...(hasValidPrice ? { price } : {}),
          ...(parsedVariants.payload.length > 0 ? { variants: parsedVariants.payload } : {}),
          is_available: data.is_available !== false,
          is_gluten_free: data.is_gluten_free === true,
          is_vegan: data.is_vegan === true,
          is_vegetarian: data.is_vegetarian === true,
          is_spicy: data.is_spicy === true,
        });
      }
      setFormData((p) => ({ ...p, [`item-${categoryId}`]: {} }));
      setExpandedCategory(categoryId);
      showToast("Item created.", "success");
    } catch (err) {
      if (err?.message !== "validation") {
        showToast(err?.data?.message || err?.message || "Failed to create item", "error");
      }
    }
  };

  const handleUpdateItem = async (item) => {
    const data = formData[`edit-item-${item.id}`] ?? item;
    const imageFile = data._imageFile instanceof File ? data._imageFile : null;
    const parsedVariants = parseVariantsDraft(data?.variants);
    if (parsedVariants.invalid) {
      showToast("Each variant needs a type and a valid price (0 or greater).", "error");
      return;
    }
    const hasPriceInput = data?.price !== undefined && data?.price !== null && data?.price !== "";
    const parsedPrice = parseFloat(data?.price);
    if (hasPriceInput && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      showToast("Price must be 0 or greater.", "error");
      return;
    }
    const finalPrice = hasPriceInput ? parsedPrice : undefined;
    if (finalPrice === undefined && parsedVariants.payload.length === 0) {
      showToast("Add a base price or at least one valid variant.", "error");
      return;
    }
    try {
      if (imageFile) {
        if (item.image_url) {
          try {
            await deleteItemImage(token, item.id);
          } catch (delErr) {
            console.warn("Could not delete previous item image:", delErr?.message || delErr);
          }
        }
        const fd = new FormData();
        fd.append("_method", "PATCH");
        fd.append("name", data.name?.trim() || item.name);
        fd.append("description", data.description ?? item.description ?? "");
        if (finalPrice !== undefined) fd.append("price", String(finalPrice));
        fd.append("is_available", data.is_available !== false ? "1" : "0");
        fd.append("is_gluten_free", data.is_gluten_free === true ? "1" : "0");
        fd.append("is_vegan", data.is_vegan === true ? "1" : "0");
        fd.append("is_vegetarian", data.is_vegetarian === true ? "1" : "0");
        fd.append("is_spicy", data.is_spicy === true ? "1" : "0");
        appendVariantsToFormData(fd, parsedVariants.payload);
        fd.append("image", imageFile, imageFile.name || "image.jpg");
        fd.append("data[image]", imageFile, imageFile.name || "image.jpg");
        await updateItem(token, item.id, fd);
      } else {
        await updateItem(token, item.id, {
          name: data.name?.trim() || item.name,
          description: data.description ?? item.description ?? "",
          ...(finalPrice !== undefined ? { price: finalPrice } : {}),
          variants: parsedVariants.payload,
          is_available: data.is_available !== false,
          is_gluten_free: data.is_gluten_free === true,
          is_vegan: data.is_vegan === true,
          is_vegetarian: data.is_vegetarian === true,
          is_spicy: data.is_spicy === true,
        });
      }
      setEditing(null);
      setItemsRefreshTrigger((t) => t + 1);
      loadMenus({ soft: true });
      showToast("Item updated.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to update item", "error");
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteItem(token, itemId);
      setItemsRefreshTrigger((t) => t + 1);
      loadMenus({ soft: true });
      showToast("Item deleted.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to delete item", "error");
    }
  };

  const handleMoveItem = async (itemId, fromCategoryId, toCategoryId) => {
    if (fromCategoryId === toCategoryId) return;
    try {
      await updateItem(token, itemId, { category_id: toCategoryId });
      setItemsRefreshTrigger((t) => t + 1);
      showToast("Item moved.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to move item", "error");
    }
  };

  const handleReorderItem = async (categoryId, itemId, newSortOrder) => {
    try {
      await reorderCategoryItems(token, categoryId, {
        item_id: itemId,
        new_sort_order: newSortOrder,
      });
      setItemsRefreshTrigger((t) => t + 1);
      showToast("Item order updated.", "success");
    } catch (err) {
      showToast(err?.data?.message || err?.message || "Failed to reorder item", "error");
    }
  };

  if (loading && menus.length === 0) return <p className="text-owner-muted">Loading menus...</p>;

  const selectedMenu = menus.find((m) => String(m.id) === String(selectedMenuId)) || menus[0] || null;
  const mainCategoriesForSelected =
    Array.isArray(selectedMenuCategories) ? selectedMenuCategories.filter((c) => !c.parent_id) : [];

  return (
    <div className="relative max-w-full min-w-0 space-y-4 pb-[calc(4rem+3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-3 flex items-center justify-between gap-2">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button type="button" onClick={loadMenus} className="touch-manipulation shrink-0 min-h-[40px] rounded-lg px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            Retry
          </button>
        </div>
      )}
      {/* Two columns: left = main menu + categories (forms), right = menu items (editor). */}
      <div
        data-menu-layout="two-col"
        className={`grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] items-start gap-3 md:gap-6 transition-opacity duration-300 ease-out ${
          menusListRefreshing ? "opacity-60" : "opacity-100"
        }`}
      >
        {/* Left: menu picker + main / sub-category forms (desktop) */}
        <aside className="order-2 hidden w-full shrink-0 space-y-4 md:sticky md:top-20 md:order-1 md:block">
          {menus.length > 0 && (
            <div className="space-y-1.5 owner-card rounded-lg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-owner-muted">Select menu</p>
              <div className="space-y-1">
                {menus.map((menu) => (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => {
                      setSelectedMenuId(menu.id);
                      setExpandedCategory(null);
                    }}
                    className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
                      String(selectedMenu?.id) === String(menu.id)
                        ? "bg-owner-action text-white shadow-sm"
                        : "text-owner-charcoal hover:bg-owner-paper"
                    }`}
                  >
                    {menu.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedMenu && (
            <div className="space-y-3">
              {/* Main category: toggle to open/close form */}
              <div className="min-w-0 owner-card rounded-lg p-3">
                <button
                  type="button"
                  onClick={() => setOpenMainCatForm((v) => !v)}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold text-owner-charcoal"
                >
                  <span className="uppercase tracking-wide">Add main category</span>
                  <span className="text-owner-action hover:underline">{openMainCatForm ? "Close" : "Add new"}</span>
                </button>
                {openMainCatForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateCategory(selectedMenu.id, "main");
                      setOpenMainCatForm(false);
                    }}
                    className="mt-3 flex flex-col gap-2.5 border-t border-owner-border pt-3"
                  >
                    <input
                      type="text"
                      placeholder="Category name *"
                      required
                      value={formData[`cat-main-${selectedMenu.id}`]?.name ?? ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          [`cat-main-${selectedMenu.id}`]: { ...(p[`cat-main-${selectedMenu.id}`] || {}), name: e.target.value },
                        }))
                      }
                      className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-sm text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={formData[`cat-main-${selectedMenu.id}`]?.description ?? ""}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          [`cat-main-${selectedMenu.id}`]: { ...(p[`cat-main-${selectedMenu.id}`] || {}), description: e.target.value },
                        }))
                      }
                      rows={2}
                      className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-xs text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                    />
                    <ImageUploadDropzone
                      id={`cat-main-img-${selectedMenu.id}`}
                      label="Image"
                      value={formData[`cat-main-${selectedMenu.id}`]?._imageFile}
                      onChange={(file) =>
                        setFormData((p) => ({
                          ...p,
                          [`cat-main-${selectedMenu.id}`]: { ...(p[`cat-main-${selectedMenu.id}`] || {}), _imageFile: file ?? undefined },
                        }))
                      }
                      onError={showToast}
                      className="mt-0.5"
                      maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
                      accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                      dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
                    />
                    <button
                      type="submit"
                      className="touch-manipulation h-8 w-full rounded-md bg-owner-action px-3 text-xs font-medium text-white hover:opacity-90"
                    >
                      Save Category
                    </button>
                  </form>
                )}
              </div>

              {mainCategoriesForSelected.length > 0 && (
                <div className="min-w-0 owner-card rounded-lg p-3">
                  <button
                    type="button"
                    onClick={() => setOpenSubCatForm((v) => !v)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold text-owner-charcoal"
                  >
                    <span className="uppercase tracking-wide">Add sub</span>
                    <span className="text-owner-action hover:underline">{openSubCatForm ? "Close" : "Add new"}</span>
                  </button>
                  {openSubCatForm && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCreateCategory(selectedMenu.id, "sub");
                        setOpenSubCatForm(false);
                      }}
                      className="mt-3 flex flex-col gap-2.5 border-t border-owner-border pt-3"
                    >
                      <input
                        type="text"
                        placeholder="Sub-category name *"
                        required
                        value={formData[`cat-sub-${selectedMenu.id}`]?.name ?? ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            [`cat-sub-${selectedMenu.id}`]: {
                              ...(p[`cat-sub-${selectedMenu.id}`] || {}),
                              name: e.target.value,
                              parent_id: p[`cat-sub-${selectedMenu.id}`]?.parent_id ?? mainCategoriesForSelected[0]?.id,
                            },
                          }))
                        }
                        className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-sm text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                      />
                      <div>
                        <label className="block text-[10px] font-medium text-owner-muted uppercase tracking-wide">Under main category</label>
                        <select
                          value={formData[`cat-sub-${selectedMenu.id}`]?.parent_id ?? mainCategoriesForSelected[0]?.id ?? ""}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              [`cat-sub-${selectedMenu.id}`]: {
                                ...(p[`cat-sub-${selectedMenu.id}`] || {}),
                                parent_id: e.target.value ? Number(e.target.value) : null,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-xs text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                        >
                          {mainCategoriesForSelected.map((mc) => (
                            <option key={mc.id} value={mc.id}>
                              {mc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        placeholder="Description (optional)"
                        value={formData[`cat-sub-${selectedMenu.id}`]?.description ?? ""}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            [`cat-sub-${selectedMenu.id}`]: { ...(p[`cat-sub-${selectedMenu.id}`] || {}), description: e.target.value },
                          }))
                        }
                        rows={2}
                        className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-1.5 text-xs text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                      />
                      <ImageUploadDropzone
                        id={`cat-sub-img-${selectedMenu.id}`}
                        label="Image"
                        value={formData[`cat-sub-${selectedMenu.id}`]?._imageFile}
                        onChange={(file) =>
                          setFormData((p) => ({
                            ...p,
                            [`cat-sub-${selectedMenu.id}`]: { ...(p[`cat-sub-${selectedMenu.id}`] || {}), _imageFile: file ?? undefined },
                          }))
                        }
                        onError={showToast}
                        className="mt-0.5"
                        maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
                        accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                        dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
                      />
                      <button
                        type="submit"
                        className="touch-manipulation h-8 w-full rounded-md bg-owner-action px-3 text-xs font-medium text-white hover:opacity-90"
                      >
                        Save Sub-category
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right: menu items (selected menu’s categories + items editor) */}
        <section className="order-1 min-w-0 w-full space-y-3 pb-6 md:order-2 md:pl-2">
          {menus.length === 0 && (
            <div className="space-y-4">
              <p className="text-owner-muted">No menus yet. Import a PDF to create one, or add dishes after you have a menu.</p>
              <MenuPdfImport
                token={token}
                restaurantId={restaurantId}
                menu={null}
                ensureMenu={ensureMenuForImport}
                fileInputRef={pdfFileInputRef}
                showToast={showToast}
                onImported={() => {
                  setCategoriesRefreshTrigger((t) => t + 1);
                  setItemsRefreshTrigger((t) => t + 1);
                  loadMenus({ soft: true });
                }}
              />
            </div>
          )}
          {menus.length > 0 && selectedMenu && (
            <MenuSection
              key={selectedMenu.id}
              menu={selectedMenu}
              token={token}
              expandedCategory={expandedCategory}
              setExpandedCategory={setExpandedCategory}
              editing={editing}
              setEditing={setEditing}
              formData={formData}
              setFormData={setFormData}
              loadCategories={loadCategories}
              loadItems={loadItems}
              refreshTrigger={itemsRefreshTrigger}
              onUpdateMenu={handleUpdateMenu}
              onDeleteMenu={handleDeleteMenu}
              onCreateCategory={handleCreateCategory}
              onCreateItem={handleCreateItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onMoveItem={handleMoveItem}
              onReorderItem={handleReorderItem}
              categoriesRefreshTrigger={categoriesRefreshTrigger}
              onUpdateCategory={handleUpdateCategory}
              onMoveCategory={handleMoveCategory}
              onReorderCategory={handleReorderCategory}
              onDeleteCategory={handleDeleteCategory}
              onImageError={(msg) => showToast(msg, "error")}
              imageCacheBust={imageCacheBust}
              restaurantId={restaurantId}
              showToast={showToast}
              pdfFileInputRef={pdfFileInputRef}
              ensureMenu={ensureMenuForImport}
              onPdfImported={() => {
                setCategoriesRefreshTrigger((t) => t + 1);
                setItemsRefreshTrigger((t) => t + 1);
                loadMenus({ soft: true });
              }}
            />
          )}
        </section>
      </div>

      {/* Mobile: select + + fixed above owner bottom nav (modals use same stack & sit above nav + this bar) */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 border-t border-owner-border/80 bg-owner-paper/95 px-3 py-2 shadow-[0_-2px_12px_rgba(45,36,30,0.07)] backdrop-blur-md md:hidden"
        style={{ bottom: OWNER_MOBILE_NAV_BOTTOM }}
      >
        <div
          className={`pointer-events-auto mx-auto flex max-w-[1400px] items-center gap-2 ${menus.length > 0 ? "justify-between" : "justify-end"}`}
        >
          {menus.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileSheet("select-menu")}
              className="touch-manipulation flex min-h-12 min-w-0 max-w-[min(72vw,calc(100%-3.75rem))] flex-1 items-center gap-2 rounded-2xl border border-owner-border bg-owner-card py-1.5 pl-3 pr-2 shadow-sm ring-1 ring-black/5"
              aria-label="Select menu"
              aria-expanded={mobileSheet === "select-menu"}
              aria-haspopup="dialog"
            >
              <div className="min-w-0 flex-1 text-left">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-owner-muted">Select menu</span>
                <span className="block truncate text-sm font-semibold leading-tight text-owner-charcoal">
                  {selectedMenu?.name ?? "…"}
                </span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 text-owner-muted"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileSheet("picker")}
            className="touch-manipulation flex size-12 shrink-0 items-center justify-center rounded-full bg-owner-action text-white shadow-lg ring-2 ring-white/30"
            aria-label="Open menu management options"
            aria-expanded={mobileSheet === "picker"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {mobileSheet === "picker" && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
          style={{ paddingBottom: OWNER_MENU_SHEET_ABOVE_NAV }}
        >
          <button
            type="button"
            className="owner-animate-modal-backdrop absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => setMobileSheet(null)}
          />
          <div className="owner-animate-modal-sheet relative mt-auto flex max-h-[min(88dvh,92vh)] w-full flex-col rounded-t-2xl border border-owner-border bg-owner-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-owner-border px-4 py-3">
              <p className="text-sm font-semibold text-owner-charcoal">Menu management</p>
              <button
                type="button"
                onClick={() => setMobileSheet(null)}
                className="touch-manipulation rounded-lg border border-owner-border px-3 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-paper"
              >
                Close
              </button>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-owner-border overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              {selectedMenu && (
                <li>
                  <button
                    type="button"
                    className="touch-manipulation flex w-full min-h-[48px] items-center gap-3 px-4 py-3 text-left text-sm font-medium text-owner-charcoal hover:bg-owner-paper active:bg-owner-paper"
                    onClick={() => setMobileSheet("main-category")}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-owner-paper text-owner-muted">
                      <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M3 6h18M3 12h12M3 18h18" />
                      </svg>
                    </span>
                    Add main category
                  </button>
                </li>
              )}
              {selectedMenu && (
                <li>
                  <button
                    type="button"
                    disabled={mainCategoriesForSelected.length === 0}
                    className="touch-manipulation flex w-full min-h-[48px] items-center gap-3 px-4 py-3 text-left text-sm font-medium text-owner-charcoal hover:bg-owner-paper active:bg-owner-paper disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                    onClick={() => {
                      if (mainCategoriesForSelected.length === 0) {
                        showToast("Add a main category first.", "error");
                        return;
                      }
                      setMobileSheet("sub-category");
                    }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-owner-paper text-owner-muted">
                      <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M4 7h16M4 12h10M4 17h14" />
                      </svg>
                    </span>
                    Add sub
                  </button>
                </li>
              )}
              {(selectedMenu || menus.length === 0) && (
                <li>
                  <button
                    type="button"
                    className="touch-manipulation flex w-full min-h-[48px] items-center gap-3 px-4 py-3 text-left text-sm font-medium text-owner-charcoal hover:bg-owner-paper active:bg-owner-paper"
                    onClick={() => {
                      setMobileSheet(null);
                      pdfFileInputRef.current?.click();
                    }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-owner-paper text-owner-muted">
                      <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M14 3h7v7M21 3l-9 9M5 11v10h10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    Import from PDF
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {mobileSheet === "select-menu" && menus.length > 0 && (
        <MenuMobileModal title="Select menu" onClose={() => setMobileSheet(null)}>
          <div className="space-y-1.5 owner-card rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-owner-muted">Active menu</p>
            <div className="space-y-1">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => {
                    setSelectedMenuId(menu.id);
                    setExpandedCategory(null);
                    setMobileSheet(null);
                  }}
                  className={`w-full rounded-md px-2.5 py-2.5 text-left text-sm font-medium transition-colors touch-manipulation ${
                    String(selectedMenu?.id) === String(menu.id)
                      ? "bg-owner-action text-white shadow-sm"
                      : "text-owner-charcoal hover:bg-owner-paper"
                  }`}
                >
                  {menu.name}
                </button>
              ))}
            </div>
          </div>
        </MenuMobileModal>
      )}

      {mobileSheet === "main-category" && selectedMenu && (
        <MenuMobileModal title="Add main category" onClose={() => setMobileSheet(null)}>
          <div className="min-w-0 owner-card rounded-lg p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategory(selectedMenu.id, "main");
              }}
              className="flex flex-col gap-2.5"
            >
              <input
                type="text"
                placeholder="Category name *"
                required
                value={formData[`cat-main-${selectedMenu.id}`]?.name ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`cat-main-${selectedMenu.id}`]: { ...(p[`cat-main-${selectedMenu.id}`] || {}), name: e.target.value },
                  }))
                }
                className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-2 text-sm text-owner-charcoal outline-none focus:ring-2 focus:ring-owner-action"
              />
              <textarea
                placeholder="Description (optional)"
                value={formData[`cat-main-${selectedMenu.id}`]?.description ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`cat-main-${selectedMenu.id}`]: { ...(p[`cat-main-${selectedMenu.id}`] || {}), description: e.target.value },
                  }))
                }
                rows={2}
                className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-2 text-xs text-owner-charcoal outline-none focus:ring-2 focus:ring-owner-action"
              />
              <ImageUploadDropzone
                id={`mobile-cat-main-img-${selectedMenu.id}`}
                label="Image"
                value={formData[`cat-main-${selectedMenu.id}`]?._imageFile}
                onChange={(file) =>
                  setFormData((p) => ({
                    ...p,
                    [`cat-main-${selectedMenu.id}`]: { ...(p[`cat-main-${selectedMenu.id}`] || {}), _imageFile: file ?? undefined },
                  }))
                }
                onError={showToast}
                className="mt-0.5"
                maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
                accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
              />
              <button
                type="submit"
                className="touch-manipulation h-10 w-full rounded-md bg-owner-action px-3 text-sm font-medium text-white hover:opacity-90"
              >
                Save category
              </button>
            </form>
          </div>
        </MenuMobileModal>
      )}

      {mobileSheet === "sub-category" && selectedMenu && mainCategoriesForSelected.length > 0 && (
        <MenuMobileModal title="Add sub" onClose={() => setMobileSheet(null)}>
          <div className="min-w-0 owner-card rounded-lg p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategory(selectedMenu.id, "sub");
              }}
              className="flex flex-col gap-2.5"
            >
              <input
                type="text"
                placeholder="Sub-category name *"
                required
                value={formData[`cat-sub-${selectedMenu.id}`]?.name ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`cat-sub-${selectedMenu.id}`]: {
                      ...(p[`cat-sub-${selectedMenu.id}`] || {}),
                      name: e.target.value,
                      parent_id: p[`cat-sub-${selectedMenu.id}`]?.parent_id ?? mainCategoriesForSelected[0]?.id,
                    },
                  }))
                }
                className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-2 text-sm text-owner-charcoal outline-none focus:ring-2 focus:ring-owner-action"
              />
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wide text-owner-muted">Under main category</label>
                <select
                  value={formData[`cat-sub-${selectedMenu.id}`]?.parent_id ?? mainCategoriesForSelected[0]?.id ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [`cat-sub-${selectedMenu.id}`]: {
                        ...(p[`cat-sub-${selectedMenu.id}`] || {}),
                        parent_id: e.target.value ? Number(e.target.value) : null,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-owner-border bg-owner-paper px-2.5 py-2 text-xs text-owner-charcoal outline-none focus:ring-2 focus:ring-owner-action"
                >
                  {mainCategoriesForSelected.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Description (optional)"
                value={formData[`cat-sub-${selectedMenu.id}`]?.description ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`cat-sub-${selectedMenu.id}`]: { ...(p[`cat-sub-${selectedMenu.id}`] || {}), description: e.target.value },
                  }))
                }
                rows={2}
                className="rounded-md border border-owner-border bg-owner-paper px-2.5 py-2 text-xs text-owner-charcoal outline-none focus:ring-2 focus:ring-owner-action"
              />
              <ImageUploadDropzone
                id={`mobile-cat-sub-img-${selectedMenu.id}`}
                label="Image"
                value={formData[`cat-sub-${selectedMenu.id}`]?._imageFile}
                onChange={(file) =>
                  setFormData((p) => ({
                    ...p,
                    [`cat-sub-${selectedMenu.id}`]: { ...(p[`cat-sub-${selectedMenu.id}`] || {}), _imageFile: file ?? undefined },
                  }))
                }
                onError={showToast}
                className="mt-0.5"
                maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
                accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
              />
              <button
                type="submit"
                className="touch-manipulation h-10 w-full rounded-md bg-owner-action px-3 text-sm font-medium text-white hover:opacity-90"
              >
                Save sub-category
              </button>
            </form>
          </div>
        </MenuMobileModal>
      )}
    </div>
  );
}

function MenuSection({
  menu,
  token,
  expandedCategory,
  setExpandedCategory,
  editing,
  setEditing,
  formData,
  setFormData,
  loadCategories,
  loadItems,
  refreshTrigger,
  categoriesRefreshTrigger,
  onUpdateMenu,
  onDeleteMenu,
  onCreateCategory,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onReorderItem,
  onUpdateCategory,
  onMoveCategory,
  onReorderCategory,
  onDeleteCategory,
  onImageError,
  imageCacheBust = 0,
  restaurantId,
  showToast,
  pdfFileInputRef,
  ensureMenu,
  onPdfImported,
}) {
  const [categories, setCategories] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [categoriesRefreshing, setCategoriesRefreshing] = useState(false);
  const categoriesSyncedLenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hadData = categoriesSyncedLenRef.current > 0;
    if (hadData) {
      setCategoriesRefreshing(true);
      setLoadingCat(false);
    } else {
      setLoadingCat(true);
      setCategoriesRefreshing(false);
    }
    loadCategories(menu.id).then((cats) => {
      if (cancelled) return;
      const flat = flattenCategories(Array.isArray(cats) ? cats : toArray(cats));
      setCategories(flat);
      categoriesSyncedLenRef.current = flat.length;
      setLoadingCat(false);
      setCategoriesRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [menu.id, loadCategories, categoriesRefreshTrigger]);

  const mainCategories = Array.isArray(categories) ? categories.filter((c) => !c.parent_id).sort(sortByOrder) : [];
  const getChildren = (parentId) =>
    Array.isArray(categories)
      ? categories.filter((c) => (c.parent_id || c.parentId) === parentId).sort(sortByOrder)
      : [];

  return (
    <div className="min-w-0 md:owner-card md:rounded-xl">
      <div className="flex items-center justify-between px-0 py-2 md:px-5 md:py-5">
        {editing === `menu-${menu.id}` ? (
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={formData[`menu-${menu.id}`] ?? menu.name}
              onChange={(e) => setFormData((p) => ({ ...p, [`menu-${menu.id}`]: e.target.value }))}
              className="flex-1 rounded border border-owner-border bg-owner-card px-2 py-1 text-owner-charcoal"
            />
            <button
              type="button"
              onClick={() => onUpdateMenu(menu)}
              className="touch-manipulation min-h-[44px] rounded-lg bg-owner-action px-4 py-2.5 text-base md:text-sm font-medium text-white hover:opacity-90"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(null)} className="touch-manipulation min-h-[44px] rounded-lg px-4 py-2.5 text-base md:text-sm font-medium text-owner-muted hover:text-owner-charcoal">
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 items-center gap-2 text-left text-lg font-bold text-owner-charcoal">
              {menu.name}
            </div>
            <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(`menu-${menu.id}`)}
              className="touch-manipulation min-h-[44px] min-w-[44px] rounded-lg px-4 py-2.5 text-base md:text-sm font-medium text-owner-muted hover:text-owner-charcoal"
            >
              Edit
            </button>
              <button
                type="button"
                onClick={() => onDeleteMenu(menu.id)}
                className="touch-manipulation min-h-[44px] min-w-[44px] rounded-lg px-4 py-2.5 text-base md:text-sm font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-owner-border px-0 py-3 md:px-6">
        <MenuPdfImport
          key={`${restaurantId}-${menu.id}`}
          token={token}
          restaurantId={restaurantId}
          menu={menu}
          fileInputRef={pdfFileInputRef}
          ensureMenu={ensureMenu}
          showToast={showToast}
          onImported={onPdfImported}
        />
      </div>

      <div className="border-t border-owner-border px-0 py-3 md:px-6 md:py-6">
        {loadingCat ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : (
          <div
            className={`space-y-3 lg:space-y-4 transition-opacity duration-300 ease-out ${
              categoriesRefreshing ? "pointer-events-none opacity-55" : "opacity-100"
            }`}
          >
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Tap a category to expand it. Drag items to reorder within a category or move them to another category.
            </p>
            {Array.isArray(categories) && categories.length > 0 ? (
              <div data-menu-inner="accordion-main-and-subcategories" className="space-y-4">
                {mainCategories.map((main) => {
                  const subCats = getChildren(main.id);
                  return (
                    <div key={main.id} className="space-y-2">
                      {/* Main category card */}
                      <CategorySection
                        menuId={menu.id}
                        category={main}
                        parentCategory={null}
                        siblingCategories={mainCategories}
                        mainCategories={mainCategories}
                        token={token}
                        expandedCategory={expandedCategory}
                        setExpandedCategory={setExpandedCategory}
                        editing={editing}
                        setEditing={setEditing}
                        formData={formData}
                        setFormData={setFormData}
                        loadItems={loadItems}
                        refreshTrigger={refreshTrigger}
                        onCreateItem={onCreateItem}
                        onUpdateItem={onUpdateItem}
                        onDeleteItem={onDeleteItem}
                        onMoveItem={onMoveItem}
                        onReorderItem={onReorderItem}
                        onUpdateCategory={onUpdateCategory}
                        onMoveCategory={onMoveCategory}
                        onReorderCategory={onReorderCategory}
                        onDeleteCategory={onDeleteCategory}
                        onImageError={onImageError}
                        imageCacheBust={imageCacheBust}
                      />
                      {/* Its sub-categories, visually nested under the main */}
                      {subCats.map((sub) => (
                        <div key={sub.id} className="ml-3 border-l border-zinc-700/40 pl-3">
                          <CategorySection
                            menuId={menu.id}
                            category={sub}
                            parentCategory={main}
                            siblingCategories={subCats}
                            mainCategories={mainCategories}
                            token={token}
                            expandedCategory={expandedCategory}
                            setExpandedCategory={setExpandedCategory}
                            editing={editing}
                            setEditing={setEditing}
                            formData={formData}
                            setFormData={setFormData}
                            loadItems={loadItems}
                            refreshTrigger={refreshTrigger}
                            onCreateItem={onCreateItem}
                            onUpdateItem={onUpdateItem}
                            onDeleteItem={onDeleteItem}
                            onMoveItem={onMoveItem}
                            onReorderItem={onReorderItem}
                            onUpdateCategory={onUpdateCategory}
                            onMoveCategory={onMoveCategory}
                            onReorderCategory={onReorderCategory}
                            onDeleteCategory={onDeleteCategory}
                            onImageError={onImageError}
                            imageCacheBust={imageCacheBust}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                No categories yet. Use the forms on the left to add one.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CategorySection({
  menuId,
  category,
  parentCategory,
  siblingCategories = [],
  mainCategories = [],
  token,
  expandedCategory,
  setExpandedCategory,
  editing,
  setEditing,
  formData,
  setFormData,
  loadItems,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onReorderItem,
  onUpdateCategory,
  onMoveCategory,
  onReorderCategory,
  onDeleteCategory,
  onImageError,
  imageCacheBust = 0,
  refreshTrigger,
}) {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsRefreshing, setItemsRefreshing] = useState(false);
  const itemsLenRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [itemDropIndicator, setItemDropIndicator] = useState(null); // { id, after }
  const newItemNameInputRef = useRef(null);
  const [shouldFocusNewItem, setShouldFocusNewItem] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(true);

  const imageUrl = (url) => (url && imageCacheBust ? `${url}${url.includes("?") ? "&" : "?"}v=${imageCacheBust}` : url);

  useEffect(() => {
    if (expandedCategory !== category.id) return;
    let cancelled = false;
    const hadItems = itemsLenRef.current > 0;
    if (hadItems) {
      setItemsRefreshing(true);
      setLoadingItems(false);
    } else {
      setLoadingItems(true);
      setItemsRefreshing(false);
    }
    loadItems(category.id).then((its) => {
      if (cancelled) return;
      setItems(its);
      itemsLenRef.current = its.length;
      setLoadingItems(false);
      setItemsRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [expandedCategory, category.id, loadItems, refreshTrigger]);

  useEffect(() => {
    if (shouldFocusNewItem && newItemNameInputRef.current) {
      // Focus without forcing the entire page to scroll
      if (typeof newItemNameInputRef.current.focus === "function") {
        try {
          newItemNameInputRef.current.focus({ preventScroll: true });
        } catch {
          newItemNameInputRef.current.focus();
        }
      }
      setShouldFocusNewItem(false);
    }
  }, [shouldFocusNewItem]);

  const isExpanded = expandedCategory === category.id;
  const isEditingCategory = editing === `cat-${category.id}`;
  const editCatData = formData[`edit-cat-${category.id}`] ?? category;
  const sortedSiblings = Array.isArray(siblingCategories) ? [...siblingCategories].sort(sortByOrder) : [];
  const categoryIndex = sortedSiblings.findIndex((c) => c.id === category.id);
  const canMoveCategoryUp = categoryIndex > 0;
  const canMoveCategoryDown = categoryIndex !== -1 && categoryIndex < sortedSiblings.length - 1;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("application/json")) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json") || "{}");
      if (data.itemId && data.categoryId && data.categoryId !== category.id && onMoveItem) {
        onMoveItem(data.itemId, data.categoryId, category.id);
      } else if (data.type === "category" && data.categoryId && data.categoryId !== category.id && onMoveCategory) {
        const newParentId = parentCategory ? parentCategory.id : category.id;
        onMoveCategory(data.categoryId, newParentId, undefined);
      }
    } catch (_) {}
  };

  const handleItemDragStart = (e, item) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ itemId: item.id, categoryId: category.id }));
    e.dataTransfer.effectAllowed = "move";
    setDraggingItemId(item.id);
  };

  const handleItemDragEnd = () => {
    setDraggingItemId(null);
    setItemDropIndicator(null);
  };

  const handleItemRowDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("application/json")) return;
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setItemDropIndicator({ id: item.id, after });
  };

  const handleItemRowDragLeave = (e, itemId) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setItemDropIndicator((cur) => (cur?.id === itemId ? null : cur));
    }
  };

  const handleItemRowDrop = (e, targetItem, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setItemDropIndicator(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json") || "{}");
      if (data.type === "category") {
        if (data.categoryId && data.categoryId !== category.id && onMoveCategory) {
          const newParentId = parentCategory ? parentCategory.id : category.id;
          onMoveCategory(data.categoryId, newParentId, undefined);
        }
        return;
      }
      if (!data.itemId || data.categoryId == null) return;

      if (data.categoryId !== category.id) {
        if (onMoveItem) onMoveItem(data.itemId, data.categoryId, category.id);
        return;
      }

      if (!onReorderItem) return;
      const fromIndex = items.findIndex((i) => String(i.id) === String(data.itemId));
      if (fromIndex === -1) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const insertAfter = e.clientY > rect.top + rect.height / 2;
      const newOrder = computeNewItemSortOrder(
        items.map((i) => i.id),
        fromIndex,
        targetIndex,
        insertAfter,
      );
      if (newOrder == null || newOrder === fromIndex + 1) return;
      void onReorderItem(category.id, data.itemId, newOrder);
    } catch (_) {}
  };

  const handleCategoryDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "category", categoryId: category.id }));
    e.dataTransfer.effectAllowed = "move";
  };

  const moveCategory = async (direction) => {
    if (!onReorderCategory || !menuId) return;
    const targetIndex = categoryIndex + direction;
    if (targetIndex < 0 || targetIndex >= sortedSiblings.length) return;
    await onReorderCategory(menuId, category.id, targetIndex + 1, parentCategory?.id ?? null);
  };

  const moveItem = async (itemId, currentIndex, direction) => {
    if (!onReorderItem) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    await onReorderItem(category.id, itemId, targetIndex + 1);
  };

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isDragOver
          ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-400 dark:bg-emerald-900/20"
          : "owner-card border-owner-border bg-owner-card"
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEditingCategory ? (
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="space-y-3">
            {(editCatData._imageFile || category.image_url) && (
              <div className="flex items-center gap-3">
                {editCatData._imageFile instanceof File ? (
                  <FilePreviewImage
                    file={editCatData._imageFile}
                    alt={category.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <img
                    src={imageUrl(category.image_url)}
                    alt={category.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <span className="text-sm text-zinc-500">
                  {editCatData._imageFile ? "New image (preview)" : "Current image"}
                </span>
              </div>
            )}
            <input
              type="text"
              placeholder="Category name"
              value={editCatData.name ?? category.name ?? ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  [`edit-cat-${category.id}`]: { ...(p[`edit-cat-${category.id}`] ?? category), name: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={editCatData.description ?? category.description ?? ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  [`edit-cat-${category.id}`]: { ...(p[`edit-cat-${category.id}`] ?? category), description: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <div>
              <label className="block text-sm md:text-xs font-medium text-zinc-700 dark:text-zinc-300">Parent category</label>
              <select
                value={editCatData.parent_id ?? category.parent_id ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((p) => ({
                    ...p,
                    [`edit-cat-${category.id}`]: { ...(p[`edit-cat-${category.id}`] ?? category), parent_id: v ? Number(v) : null },
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Main category (top-level)</option>
                {(mainCategories || []).filter((m) => m.id !== category.id).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm md:text-xs font-medium text-zinc-700 dark:text-zinc-300">Sort order</label>
              <input
                type="number"
                min="0"
                value={editCatData.sort_order ?? category.sort_order ?? 0}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`edit-cat-${category.id}`]: { ...(p[`edit-cat-${category.id}`] ?? category), sort_order: Number(e.target.value) || 0 },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <ImageUploadDropzone
              id={`edit-cat-img-${category.id}`}
              label="Change image"
              value={editCatData._imageFile}
              onChange={(file) =>
                setFormData((p) => ({
                  ...p,
                  [`edit-cat-${category.id}`]: { ...(p[`edit-cat-${category.id}`] ?? category), _imageFile: file ?? undefined },
                }))
              }
              onError={onImageError}
              className="mt-1"
              maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
              accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
              dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdateCategory(category, editCatData._imageFile)}
                className="touch-manipulation min-h-[48px] rounded-xl bg-emerald-600 px-4 py-3 text-base md:text-sm font-medium text-white"
              >
                Save
              </button>
              <button type="button" onClick={() => setEditing(null)} className="touch-manipulation min-h-[48px] rounded-xl px-4 py-3 text-base md:text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
        ) : (
        <div
          draggable
          onDragStart={handleCategoryDragStart}
          className="flex min-h-[40px] cursor-grab items-center justify-between gap-2 px-3 py-1.5 active:cursor-grabbing hover:bg-owner-paper/50"
        >
          <button
            type="button"
            onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
            className="touch-manipulation flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-owner-charcoal"
          >
            <span className="text-[10px] text-owner-muted">{isExpanded ? "▼" : "▶"}</span>
            {category.image_url && (
              <img src={imageUrl(category.image_url)} alt={category.name} className="h-6 w-6 shrink-0 rounded-md object-cover" />
            )}
            <span className="min-w-0 truncate">{category.name}</span>
          </button>
          <div className="flex shrink-0 gap-1 opacity-80 hover:opacity-100">
            <button
              type="button"
              disabled={!canMoveCategoryUp}
              onClick={() => moveCategory(-1)}
              className="touch-manipulation h-7 w-7 rounded-md text-xs font-medium text-owner-muted hover:bg-owner-border hover:text-owner-charcoal disabled:cursor-not-allowed disabled:opacity-30"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={!canMoveCategoryDown}
              onClick={() => moveCategory(1)}
              className="touch-manipulation h-7 w-7 rounded-md text-xs font-medium text-owner-muted hover:bg-owner-border hover:text-owner-charcoal disabled:cursor-not-allowed disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => setEditing(`cat-${category.id}`)}
              className="touch-manipulation h-7 px-2 rounded-md text-[11px] font-medium text-owner-muted hover:bg-owner-border hover:text-owner-charcoal"
            >
              Edit
            </button>
            {onDeleteCategory && (
              <button
                type="button"
                onClick={() => onDeleteCategory(category.id)}
                className="touch-manipulation h-7 px-2 rounded-md text-[11px] font-medium text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className={`min-h-0 overflow-hidden ${!isExpanded ? "pointer-events-none" : ""}`}>
          <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
          {loadingItems && items.length === 0 ? (
            <p className="mb-4 text-xs text-zinc-500">Loading items...</p>
          ) : (
            <div
              className={`transition-opacity duration-300 ease-out ${
                itemsRefreshing ? "pointer-events-none opacity-55" : "opacity-100"
              }`}
            >
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Drag items to reorder in this list, or onto another category to move them.
              </p>
              <ul className="mb-4 divide-y divide-owner-border">
              {items.map((item, itemIndex) => {
                const editData = formData[`edit-item-${item.id}`] ?? item;
                const isRowDropTarget =
                  itemDropIndicator && String(itemDropIndicator.id) === String(item.id);
                const isEditingItem = editing === `item-${item.id}`;
                return (
                  <li
                    key={item.id}
                    draggable={!isEditingItem}
                    onDragStart={!isEditingItem ? (e) => handleItemDragStart(e, item) : undefined}
                    onDragEnd={!isEditingItem ? handleItemDragEnd : undefined}
                    onDragOver={(e) => handleItemRowDragOver(e, item)}
                    onDragLeave={(e) => handleItemRowDragLeave(e, item.id)}
                    onDrop={(e) => handleItemRowDrop(e, item, itemIndex)}
                    className={`py-3 transition-[box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      !isEditingItem ? "cursor-grab active:cursor-grabbing" : ""
                    } ${isEditingItem ? "rounded-md bg-owner-paper/60 ring-1 ring-owner-action/25" : ""} ${
                      draggingItemId === item.id ? "opacity-50" : ""
                    } ${isRowDropTarget && !isEditingItem ? "rounded-md ring-2 ring-inset ring-emerald-500" : ""}`}
                  >
                    <div
                      className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        isEditingItem ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className={`min-h-0 ${!isEditingItem ? "pointer-events-none" : ""}`}>
                        <div className="space-y-3 pb-0.5">
                        {(editData._imageFile || item.image_url) && (
                          <div className="flex items-center gap-3">
                            {editData._imageFile instanceof File ? (
                              <FilePreviewImage
                                file={editData._imageFile}
                                alt={item.name}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            ) : (
                              <img
                                src={imageUrl(item.image_url)}
                                alt={item.name}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            )}
                            <span className="text-xs text-owner-muted">
                              {editData._imageFile ? "New image (preview)" : "Current image"}
                            </span>
                          </div>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={editData.name ?? item.name}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), name: e.target.value },
                              }))
                            }
                            placeholder="Name"
                            className="rounded-md border border-owner-border px-2.5 py-1.5 text-sm bg-owner-card text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editData.price ?? item.price ?? ""}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), price: e.target.value },
                              }))
                            }
                            placeholder="Base price"
                            className="rounded-md border border-owner-border px-2.5 py-1.5 text-sm bg-owner-card text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                          />
                        </div>
                        <textarea
                          value={editData.description ?? item.description ?? ""}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), description: e.target.value },
                            }))
                          }
                          placeholder="Description"
                          rows={2}
                          className="w-full rounded-md border border-owner-border px-2.5 py-1.5 text-xs bg-owner-card text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
                        />
                        <div className="space-y-2 border-t border-owner-border pt-2.5">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="text-[10px] font-medium text-owner-muted uppercase tracking-wide">Variants</p>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((p) => {
                                  const key = `edit-item-${item.id}`;
                                  const prev = p[key] ?? item;
                                  const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                                  return {
                                    ...p,
                                    [key]: {
                                      ...prev,
                                      variants: [...prevVariants, { type_name: "", price: "", is_available: true }],
                                    },
                                  };
                                })
                              }
                              className="touch-manipulation rounded border border-owner-border px-1.5 py-0.5 text-[10px] font-medium text-owner-charcoal hover:bg-owner-paper"
                            >
                              + Add variant
                            </button>
                          </div>
                          {Array.isArray(editData.variants) && editData.variants.length > 0 ? (
                            <div className="space-y-2">
                              {editData.variants.map((variant, variantIdx) => (
                                <div key={`edit-variant-${item.id}-${variantIdx}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_auto_auto]">
                                  <input
                                    type="text"
                                    placeholder="Type (e.g. Beef)"
                                    value={variant?.type_name ?? ""}
                                    onChange={(e) =>
                                      setFormData((p) => {
                                        const key = `edit-item-${item.id}`;
                                        const prev = p[key] ?? item;
                                        const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                                        return {
                                          ...p,
                                          [key]: {
                                            ...prev,
                                            variants: prevVariants.map((v, i) => (i === variantIdx ? { ...v, type_name: e.target.value } : v)),
                                          },
                                        };
                                      })
                                    }
                                    className="rounded border border-owner-border px-2 py-1 text-xs bg-owner-paper text-owner-charcoal"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Price"
                                    value={variant?.price ?? ""}
                                    onChange={(e) =>
                                      setFormData((p) => {
                                        const key = `edit-item-${item.id}`;
                                        const prev = p[key] ?? item;
                                        const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                                        return {
                                          ...p,
                                          [key]: {
                                            ...prev,
                                            variants: prevVariants.map((v, i) => (i === variantIdx ? { ...v, price: e.target.value } : v)),
                                          },
                                        };
                                      })
                                    }
                                    className="rounded border border-owner-border px-2 py-1 text-xs bg-owner-paper text-owner-charcoal"
                                  />
                                  <label className="flex items-center gap-1.5 text-[10px] text-owner-charcoal">
                                    <input
                                      type="checkbox"
                                      checked={variant?.is_available !== false}
                                      onChange={(e) =>
                                        setFormData((p) => {
                                          const key = `edit-item-${item.id}`;
                                          const prev = p[key] ?? item;
                                          const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                                          return {
                                            ...p,
                                            [key]: {
                                              ...prev,
                                              variants: prevVariants.map((v, i) => (i === variantIdx ? { ...v, is_available: e.target.checked } : v)),
                                            },
                                          };
                                        })
                                      }
                                      className="rounded border-owner-border"
                                    />
                                    Available
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((p) => {
                                        const key = `edit-item-${item.id}`;
                                        const prev = p[key] ?? item;
                                        const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                                        return {
                                          ...p,
                                          [key]: {
                                            ...prev,
                                            variants: prevVariants.filter((_, i) => i !== variantIdx),
                                          },
                                        };
                                      })
                                    }
                                    className="touch-manipulation rounded px-1.5 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-owner-muted">
                              Add variants to offer multiple options.
                            </p>
                          )}
                        </div>
                        <ImageUploadDropzone
                          id={`edit-item-image-${item.id}`}
                          label="Change image"
                          value={editData._imageFile}
                          onChange={(file) =>
                            setFormData((p) => ({
                              ...p,
                              [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), _imageFile: file ?? undefined },
                            }))
                          }
                          onError={onImageError}
                          className="mt-1"
                          maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
                          accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                          dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
                        />
                        <div className="flex flex-wrap gap-3 py-1">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editData.is_gluten_free === true}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), is_gluten_free: e.target.checked },
                                }))
                              }
                              className="rounded border-owner-border"
                            />
                            <span className="text-xs text-owner-charcoal">Gluten-free</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editData.is_vegan === true}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), is_vegan: e.target.checked },
                                }))
                              }
                              className="rounded border-owner-border"
                            />
                            <span className="text-xs text-owner-charcoal">Vegan</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editData.is_vegetarian === true}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), is_vegetarian: e.target.checked },
                                }))
                              }
                              className="rounded border-owner-border"
                            />
                            <span className="text-xs text-owner-charcoal">Vegetarian</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editData.is_spicy === true}
                              onChange={(e) =>
                                setFormData((p) => ({
                                  ...p,
                                  [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), is_spicy: e.target.checked },
                                }))
                              }
                              className="rounded border-owner-border"
                            />
                            <span className="text-xs text-owner-charcoal">Spicy</span>
                          </label>
                        </div>
                        <label className="flex items-center gap-1.5 border-t border-owner-border pt-2">
                          <input
                            type="checkbox"
                            checked={editData.is_available !== false}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                [`edit-item-${item.id}`]: { ...(p[`edit-item-${item.id}`] ?? item), is_available: e.target.checked },
                              }))
                            }
                            className="rounded border-owner-border"
                          />
                          <span className="text-xs font-medium text-owner-charcoal">Available</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateItem(item)}
                            className="touch-manipulation h-8 rounded-md bg-owner-action px-4 text-xs font-medium text-white hover:opacity-90"
                          >
                            Save
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="touch-manipulation h-8 rounded-md px-3 text-xs font-medium text-owner-muted hover:bg-owner-paper hover:text-owner-charcoal">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>
                    <div
                      className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        isEditingItem ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                      }`}
                    >
                      <div className={`min-h-0 ${isEditingItem ? "pointer-events-none" : ""}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        {/* Left: image + text */}
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-owner-paper flex items-center justify-center">
                            {item.image_url ? (
                              <img
                                src={imageUrl(item.image_url)}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-owner-muted">
                                {item.name?.charAt(0)?.toUpperCase() || "I"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-owner-charcoal truncate">
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="mt-0.5 text-xs text-owner-muted line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            {Array.isArray(item.variants) && item.variants.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {[...item.variants].sort(sortByOrder).map((variant, idx) => (
                                  <span key={`item-${item.id}-variant-${variant?.id ?? idx}`} className="rounded border border-owner-border bg-owner-paper px-1 py-0.5 text-[10px] text-owner-charcoal">
                                    {variant?.type_name || "Variant"}{" "}
                                    {Number.isFinite(parseFloat(variant?.price)) ? parseFloat(variant.price).toFixed(2) : variant?.price}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.is_gluten_free && (
                                <span className="rounded bg-owner-paper px-1 py-0.5 text-[10px] text-owner-muted">GF</span>
                              )}
                              {item.is_vegan && (
                                <span className="rounded bg-owner-paper px-1 py-0.5 text-[10px] text-owner-muted">V</span>
                              )}
                              {item.is_vegetarian && (
                                <span className="rounded bg-owner-paper px-1 py-0.5 text-[10px] text-owner-muted">Veg</span>
                              )}
                              {item.is_spicy && (
                                <span className="rounded bg-owner-paper px-1 py-0.5 text-[10px] text-owner-muted">Spicy</span>
                              )}
                              {item.is_available === false && (
                                <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700">Unavailable</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: price + actions */}
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5 shrink-0">
                          <p className="text-sm font-semibold text-owner-charcoal">
                            {getItemPriceLabel(item)}
                          </p>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={itemIndex === 0}
                              onClick={() => moveItem(item.id, itemIndex, -1)}
                              className="touch-manipulation h-7 w-7 rounded-md text-xs font-medium text-owner-muted hover:bg-owner-border hover:text-owner-charcoal disabled:cursor-not-allowed disabled:opacity-30"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={itemIndex === items.length - 1}
                              onClick={() => moveItem(item.id, itemIndex, 1)}
                              className="touch-manipulation h-7 w-7 rounded-md text-xs font-medium text-owner-muted hover:bg-owner-border hover:text-owner-charcoal disabled:cursor-not-allowed disabled:opacity-30"
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((p) => ({
                                  ...p,
                                  [`edit-item-${item.id}`]: {
                                    name: item.name,
                                    description: item.description ?? "",
                                    price: item.price,
                                    variants: toVariantDrafts(item.variants),
                                    is_available: item.is_available !== false,
                                    is_gluten_free: !!item.is_gluten_free,
                                    is_vegan: !!item.is_vegan,
                                    is_vegetarian: !!item.is_vegetarian,
                                    is_spicy: !!item.is_spicy,
                                    _imageFile: undefined,
                                  },
                                }));
                                setEditing(`item-${item.id}`);
                              }}
                              className="touch-manipulation h-7 px-2 rounded-md text-[11px] font-medium text-owner-muted hover:bg-owner-border hover:text-owner-charcoal"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="touch-manipulation h-7 px-2 rounded-md text-[11px] font-medium text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </li>
                );
              })}
              </ul>
              <div className="overflow-hidden border-t border-owner-border/80 pt-2">
                <button
                  type="button"
                  onClick={() => setAddItemOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2 py-2.5 text-left touch-manipulation hover:bg-owner-paper/40"
                  aria-expanded={addItemOpen}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-owner-charcoal">
                    Add new item
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-owner-muted transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${addItemOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div
                  className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    addItemOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onCreateItem(category.id, e);
                const list = await loadItems(category.id);
                setItems(list);
                itemsLenRef.current = list.length;
                setShouldFocusNewItem(true);
              } catch (_) {
                // Validation or API error already handled by parent
              }
            }}
            className="flex flex-col gap-3 border-t border-owner-border pb-1 pt-2"
          >
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Item name *"
                required
                ref={newItemNameInputRef}
                value={formData[`item-${category.id}`]?.name || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), name: e.target.value },
                  }))
                }
                className="min-w-[140px] flex-1 rounded-md border border-owner-border px-2.5 py-1.5 text-sm bg-owner-paper text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Base price"
                value={formData[`item-${category.id}`]?.price ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), price: e.target.value },
                  }))
                }
                className="w-24 rounded-md border border-owner-border px-2.5 py-1.5 text-sm bg-owner-paper text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
              />
            </div>
            <div className="space-y-2 border-t border-owner-border pt-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium text-owner-muted uppercase tracking-wide">Variants (optional)</p>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => {
                      const key = `item-${category.id}`;
                      const prev = p[key] || {};
                      const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                      return {
                        ...p,
                        [key]: {
                          ...prev,
                          variants: [...prevVariants, { type_name: "", price: "", is_available: true }],
                        },
                      };
                    })
                  }
                  className="touch-manipulation rounded border border-owner-border px-1.5 py-0.5 text-[10px] font-medium text-owner-charcoal hover:bg-owner-card"
                >
                  + Add variant
                </button>
              </div>
              {Array.isArray(formData[`item-${category.id}`]?.variants) && formData[`item-${category.id}`]?.variants?.length > 0 ? (
                <div className="space-y-2">
                  {formData[`item-${category.id}`].variants.map((variant, variantIdx) => (
                    <div key={`new-variant-${variantIdx}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_100px_auto_auto]">
                      <input
                        type="text"
                        placeholder="Type (e.g. Beef)"
                        value={variant?.type_name ?? ""}
                        onChange={(e) =>
                          setFormData((p) => {
                            const key = `item-${category.id}`;
                            const prev = p[key] || {};
                            const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                            return {
                              ...p,
                              [key]: {
                                ...prev,
                                variants: prevVariants.map((v, i) => (i === variantIdx ? { ...v, type_name: e.target.value } : v)),
                              },
                            };
                          })
                        }
                        className="rounded border border-owner-border px-2 py-1 text-xs bg-owner-card text-owner-charcoal"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={variant?.price ?? ""}
                        onChange={(e) =>
                          setFormData((p) => {
                            const key = `item-${category.id}`;
                            const prev = p[key] || {};
                            const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                            return {
                              ...p,
                              [key]: {
                                ...prev,
                                variants: prevVariants.map((v, i) => (i === variantIdx ? { ...v, price: e.target.value } : v)),
                              },
                            };
                          })
                        }
                        className="rounded border border-owner-border px-2 py-1 text-xs bg-owner-card text-owner-charcoal"
                      />
                      <label className="flex items-center gap-1.5 text-[10px] text-owner-charcoal">
                        <input
                          type="checkbox"
                          checked={variant?.is_available !== false}
                          onChange={(e) =>
                            setFormData((p) => {
                              const key = `item-${category.id}`;
                              const prev = p[key] || {};
                              const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                              return {
                                ...p,
                                [key]: {
                                  ...prev,
                                  variants: prevVariants.map((v, i) => (i === variantIdx ? { ...v, is_available: e.target.checked } : v)),
                                },
                              };
                            })
                          }
                          className="rounded border-owner-border"
                        />
                        Available
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => {
                            const key = `item-${category.id}`;
                            const prev = p[key] || {};
                            const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
                            return {
                              ...p,
                              [key]: {
                                ...prev,
                                variants: prevVariants.filter((_, i) => i !== variantIdx),
                              },
                            };
                          })
                        }
                        className="touch-manipulation rounded px-1.5 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-owner-muted">
                  Add variants to offer multiple options.
                </p>
              )}
            </div>
            <textarea
              placeholder="Description (optional)"
              value={formData[`item-${category.id}`]?.description || ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), description: e.target.value },
                }))
              }
              rows={2}
              className="w-full rounded-md border border-owner-border px-2.5 py-1.5 text-xs bg-owner-paper text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
            />
            <ImageUploadDropzone
              id={`item-img-${category.id}`}
              label="Image (optional)"
              value={formData[`item-${category.id}`]?._imageFile}
              onChange={(file) =>
                setFormData((p) => ({
                  ...p,
                  [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), _imageFile: file ?? undefined },
                }))
              }
              onError={onImageError}
              className="mt-0.5"
              maxBytes={MAX_MENU_IMAGE_BYTES}
                      enableCrop
              accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
              dropHintWhenCrop="Drop or click - crop to square; large photos are resized automatically."
            />
            <div className="flex flex-wrap gap-3 py-1">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={formData[`item-${category.id}`]?.is_gluten_free === true}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), is_gluten_free: e.target.checked },
                    }))
                  }
                  className="rounded border-owner-border"
                />
                <span className="text-xs text-owner-charcoal">Gluten-free</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={formData[`item-${category.id}`]?.is_vegan === true}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), is_vegan: e.target.checked },
                    }))
                  }
                  className="rounded border-owner-border"
                />
                <span className="text-xs text-owner-charcoal">Vegan</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={formData[`item-${category.id}`]?.is_vegetarian === true}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), is_vegetarian: e.target.checked },
                    }))
                  }
                  className="rounded border-owner-border"
                />
                <span className="text-xs text-owner-charcoal">Vegetarian</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={formData[`item-${category.id}`]?.is_spicy === true}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [`item-${category.id}`]: { ...(p[`item-${category.id}`] || {}), is_spicy: e.target.checked },
                    }))
                  }
                  className="rounded border-owner-border"
                />
                <span className="text-xs text-owner-charcoal">Spicy</span>
              </label>
            </div>
            <button type="submit" className="touch-manipulation h-8 w-full rounded-md bg-owner-action px-4 text-xs font-medium text-white hover:opacity-90 sm:w-auto self-start">
              Add Item
            </button>
          </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
