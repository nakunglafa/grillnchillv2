"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { isItemSpicy, SpicyIndicator } from "@/components/SpicyIndicator";
import { toArray } from "@/lib/owner-utils";
import { formatCurrencyEUR as formatPrice } from "@/lib/format-currency";
import { useCart } from "@/context/CartContext";
import { useOrderingHours } from "@/context/OrderingHoursContext";
import { OrderTypeModal } from "@/components/OrderTypeModal";

function sortBySortOrder(a, b) {
  const ao = Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
  const bo = Number.isFinite(Number(b?.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return Number(a?.id || 0) - Number(b?.id || 0);
}

function getAvailableVariants(item) {
  const variantsRaw = Array.isArray(item?.variants) ? item.variants : toArray(item?.variants || []);
  return variantsRaw
    .filter((v) => v && String(v.type_name ?? "").trim() !== "")
    .sort(sortBySortOrder)
    .filter((v) => v?.is_available !== false);
}

function createVariantCartItem(item, variant) {
  const variantId = variant?.id ?? `${variant?.type_name ?? "variant"}-${variant?.sort_order ?? "0"}`;
  const variantName = String(variant?.type_name ?? "").trim() || "Variant";
  return {
    ...item,
    id: `${item.id}::${variantId}`,
    menu_item_id: item.id,
    variant_id: variant?.id ?? null,
    variant_type_name: variantName,
    base_name: item.name,
    name: `${item.name} - ${variantName}`,
    price: variant?.price ?? item?.price ?? 0,
  };
}

function MenuItemCard({ item, addItem, orderingEnabled }) {
  const availableVariants = getAvailableVariants(item);
  const itemAvailable = item?.is_available !== false;
  const hasBasePrice = item?.price != null && item?.price !== "";
  const canAddBase = itemAvailable && hasBasePrice && availableVariants.length === 0;
  const minVariantPrice = availableVariants.length
    ? Math.min(...availableVariants.map((v) => parseFloat(v?.price)).filter((n) => Number.isFinite(n)))
    : null;

  return (
    <article className="flex h-full flex-col overflow-hidden bg-white/[0.04] shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all hover:bg-white/[0.06]">
      {item.image_url && (
        <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-white/10 ring-1 ring-white/10">
          <img
            src={item.image_url}
            alt={item.name ? item.name : "Menu item"}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="flex flex-wrap items-start justify-between gap-1.5">
          <span
            className="notranslate flex min-w-0 items-center gap-1 text-[15px] font-sans font-bold leading-tight tracking-[0.01em] text-white"
            translate="no"
          >
            <span className="min-w-0">{item.name}</span>
            {isItemSpicy(item) ? <SpicyIndicator sizeClass="text-[15px]" /> : null}
          </span>
          {availableVariants.length > 0 ? (
            <span className="text-sm font-semibold text-accent">
              {Number.isFinite(minVariantPrice)
                ? `From ${formatPrice(minVariantPrice)}`
                : `${availableVariants.length} variants`}
            </span>
          ) : item.price != null && item.price !== "" ? (
            <span className="text-sm font-semibold text-accent">{formatPrice(item.price)}</span>
          ) : null}
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-3 font-sans text-[12px] italic leading-snug text-white/65">{item.description}</p>
        )}
        {item.dietary_info && (
          <p className="mt-1 text-[11px] leading-tight text-white/45">{item.dietary_info}</p>
        )}
        {availableVariants.length > 0 ? (
          <div className="mt-2 flex flex-1 flex-col space-y-1.5">
            {availableVariants.map((variant) => (
              <div
                key={variant?.id ?? `${item?.id}-${variant?.type_name}-${variant?.sort_order}`}
                className="flex items-center justify-between gap-2 bg-white/[0.03] px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">
                    {variant?.type_name}
                  </p>
                  <p className="text-[13px] font-semibold text-accent">{formatPrice(variant?.price)}</p>
                </div>
                {!orderingEnabled ? (
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-white/40">Closed</span>
                ) : itemAvailable ? (
                  <button
                    type="button"
                    onClick={() => addItem(createVariantCartItem(item, variant), 1)}
                    className="shrink-0 rounded-sm bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover"
                  >
                    Add
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-white/40">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          !orderingEnabled && canAddBase ? (
            <p className="mt-auto text-center text-[10px] uppercase tracking-[0.12em] text-white/40">Ordering closed</p>
          ) : orderingEnabled && canAddBase ? (
            <button
              type="button"
              onClick={() => addItem({ ...item, menu_item_id: item.id }, 1)}
              className="mt-auto rounded-sm bg-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover"
            >
              Add to Cart
            </button>
          ) : null
        )}
      </div>
    </article>
  );
}

function SpecialMenuItemCard({ item, addItem, orderingEnabled }) {
  const availableVariants = getAvailableVariants(item);
  const itemAvailable = item?.is_available !== false;
  const hasBasePrice = item?.price != null && item?.price !== "";
  const canAddBase = itemAvailable && hasBasePrice && availableVariants.length === 0;
  const minVariantPrice = availableVariants.length
    ? Math.min(...availableVariants.map((v) => parseFloat(v?.price)).filter((n) => Number.isFinite(n)))
    : null;
  const priceLabel = availableVariants.length > 0
    ? (Number.isFinite(minVariantPrice) ? `From ${formatPrice(minVariantPrice)}` : `${availableVariants.length} variants`)
    : (item.price != null && item.price !== "" ? formatPrice(item.price) : "");

  return (
    <article className="flex h-full flex-col overflow-hidden bg-white/[0.04] shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-all hover:bg-white/[0.06]">
      {item.image_url ? (
        <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-white/10 ring-1 ring-white/10">
          <img
            src={item.image_url}
            alt={item.name ? item.name : "Special menu item"}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3
            className="notranslate flex min-w-0 flex-wrap items-center gap-1.5 font-sans text-lg font-extrabold leading-tight tracking-[0.02em] text-white md:text-xl"
            translate="no"
          >
            <span className="min-w-0">{item.name}</span>
            {isItemSpicy(item) ? <SpicyIndicator sizeClass="text-lg md:text-xl" /> : null}
          </h3>
          {priceLabel ? (
            <p className="font-sans text-sm font-semibold tracking-[0.01em] text-accent">{priceLabel}</p>
          ) : null}
        </div>

        {item.description ? (
          <p className="mt-2 line-clamp-4 font-sans text-[12px] leading-relaxed text-white/68">{item.description}</p>
        ) : null}

        {availableVariants.length > 0 ? (
          <div className="mt-3 flex flex-1 flex-col space-y-1.5">
            {availableVariants.map((variant) => (
              <div
                key={variant?.id ?? `${item?.id}-${variant?.type_name}-${variant?.sort_order}`}
                className="flex items-center justify-between gap-2 bg-white/[0.03] px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">
                    {variant?.type_name}
                  </p>
                  <p className="font-sans text-[13px] font-semibold text-accent">{formatPrice(variant?.price)}</p>
                </div>
                {!orderingEnabled ? (
                  <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.12em] text-white/40">Closed</span>
                ) : itemAvailable ? (
                  <button
                    type="button"
                    onClick={() => addItem(createVariantCartItem(item, variant), 1)}
                    className="shrink-0 rounded-sm bg-accent px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover"
                  >
                    Add
                  </button>
                ) : (
                  <span className="shrink-0 font-sans text-[10px] uppercase tracking-[0.12em] text-white/40">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          !orderingEnabled && canAddBase ? (
            <p className="mt-auto text-center font-sans text-[10px] uppercase tracking-[0.12em] text-white/40">Ordering closed</p>
          ) : orderingEnabled && canAddBase ? (
            <button
              type="button"
              onClick={() => addItem({ ...item, menu_item_id: item.id }, 1)}
              className="mt-auto rounded-sm bg-accent px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover"
            >
              Add to Cart
            </button>
          ) : null
        )}
      </div>
    </article>
  );
}

function normalizeText(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

function sentenceCase(s) {
  const str = String(s ?? "");
  if (!str.trim()) return str;
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function CategorySection({ category, addItem, orderingEnabled, isNested = false, searchTerm }) {
  const items = Array.isArray(category.items)
    ? category.items
    : toArray(category.items || []);
  const children = Array.isArray(category.children)
    ? category.children
    : toArray(category.children || []);
  const sortedItems = [...items].sort(sortBySortOrder);
  const sortedChildren = [...children].sort(sortBySortOrder);

  const term = normalizeText(searchTerm);
  const matchesItem = (item) => {
    if (!term) return true;
    const name = normalizeText(item?.name);
    const desc = normalizeText(item?.description);
    return name.includes(term) || desc.includes(term);
  };

  const filteredItems = sortedItems.filter(matchesItem);
  const shouldShowCategory = !term
    ? true
    : filteredItems.length > 0 || sortedChildren.some((child) => CategorySectionPreviewMatches(child, term));

  const HeadingTag = isNested ? "h4" : "h3";
  const headingClass = isNested
    ? "font-sans text-lg font-extrabold uppercase tracking-[0.04em] text-white text-center md:text-xl"
    : "font-sans text-2xl font-extrabold uppercase tracking-[0.05em] text-white text-center md:text-3xl";

  if (!shouldShowCategory) return null;

  return (
    <div
      id={category?.id != null ? `menu-cat-${String(category.id)}` : undefined}
      className={isNested ? "mt-4" : ""}
    >
      {(category.name || category.description) && (
        <div className="mb-3 flex flex-col items-center gap-2 text-center">
          {category.image_url && (
            <div className="h-16 w-16 shrink-0 overflow-hidden bg-white/10 ring-1 ring-white/10">
              <img
                src={category.image_url}
                alt={category.name ? `${category.name} category` : "Category"}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            {category.name && (
              <HeadingTag className={`notranslate ${headingClass}`} translate="no">
                {sentenceCase(category.name)}
              </HeadingTag>
            )}
            {category.description && (
              <p className="mt-1 font-sans text-[11px] italic leading-snug text-white/60 md:text-xs">{category.description}</p>
            )}
          </div>
        </div>
      )}
      {filteredItems.length > 0 && (
        <ul className="mt-2 list-none p-0 m-0 columns-1 gap-x-4 sm:columns-2 lg:columns-3 [column-fill:balance]">
          {filteredItems.map((item) => (
            <li key={item.id ?? item.name ?? "menu-item"} className="mb-4 break-inside-avoid">
              <MenuItemCard item={item} addItem={addItem} orderingEnabled={orderingEnabled} />
            </li>
          ))}
        </ul>
      )}
      {sortedChildren.map((child) => (
        <CategorySection
          key={child.id ?? child.name ?? "menu-category"}
          category={child}
          addItem={addItem}
          orderingEnabled={orderingEnabled}
          isNested
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}


function CategorySectionPreviewMatches(category, term) {
  const items = (Array.isArray(category?.items) ? category.items : toArray(category?.items || [])).sort(sortBySortOrder);
  const children = (Array.isArray(category?.children) ? category.children : toArray(category?.children || [])).sort(sortBySortOrder);
  const matchesItem = (item) => {
    const name = normalizeText(item?.name);
    const desc = normalizeText(item?.description);
    return name.includes(term) || desc.includes(term);
  };
  if (items.some(matchesItem)) return true;
  return children.some((c) => CategorySectionPreviewMatches(c, term));
}

function SpecialMenuSection({ specialMenu, addItem, orderingEnabled, searchTerm }) {
  const term = normalizeText(searchTerm);
  const items = (Array.isArray(specialMenu?.items) ? specialMenu.items : toArray(specialMenu?.items || [])).sort(sortBySortOrder);
  const filtered = !term
    ? items
    : items.filter((it) => normalizeText(it?.name).includes(term) || normalizeText(it?.description).includes(term));

  if (!filtered.length) return null;

  return (
    <section className="overflow-hidden bg-white/[0.03] shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="divide-y divide-white/10">
        <div className="px-4 py-4 md:px-5 md:py-5">
          <h2
            className="notranslate text-center font-sans text-2xl font-extrabold uppercase tracking-[0.05em] text-white md:text-3xl"
            translate="no"
          >
            {specialMenu?.name || "Special"}
          </h2>
          <p className="mt-1 text-center font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-white/60 md:text-xs">
            Special menu items
          </p>
          <ul className="mt-4 list-none p-0 m-0 columns-1 gap-x-4 sm:columns-2 lg:columns-3 [column-fill:balance]">
            {filtered.map((item) => (
              <li key={item.id ?? item.name ?? "special-item"} className="mb-4 break-inside-avoid">
                <SpecialMenuItemCard item={item} addItem={addItem} orderingEnabled={orderingEnabled} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function MenuClient({ restaurant, menus, specialMenuLists }) {
  const { addItem, setOrderType } = useCart();
  const { orderingAccepting, openingSlots } = useOrderingHours();
  const showOrderingClosedBanner =
    Array.isArray(openingSlots) && openingSlots.length > 0 && !orderingAccepting;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [orderTypeModalOpen, setOrderTypeModalOpen] = useState(true);
  const mobileCategoryRefs = useRef({});

  function handleOrderTypeSelect(type) {
    setOrderType(type);
    setOrderTypeModalOpen(false);
  }

  function handleOrderTypeClose() {
    // Keep current/saved choice (defaults to pickup); browsing stays unblocked
    setOrderTypeModalOpen(false);
  }

  // sidebar: top-level categories (in order) for quick jumps + filtering UI
  const buildSidebar = (menu) => {
    const categories = (Array.isArray(menu?.categories) ? menu.categories : toArray(menu?.categories || menu)).sort(sortBySortOrder);
    const out = [];
    const walk = (cat, depth) => {
      const id = String(cat?.id ?? cat?.name ?? "").toString();
      if (cat && cat.name) {
        out.push({ id: id || cat.name, name: cat.name, depth });
      }
      const children = (Array.isArray(cat?.children) ? cat.children : toArray(cat?.children || [])).sort(sortBySortOrder);
      children.forEach((c) => walk(c, depth + 1));
    };
    categories.forEach((c) => walk(c, 0));
    return out;
  };

  const sidebarCategories = Array.isArray(menus) && menus.length > 0 ? buildSidebar(menus[0]) : [];
  const displayCategories = useMemo(() => {
    const seen = new Set();
    return sidebarCategories
      .filter((c) => {
        const id = String(c?.id ?? "").trim();
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 30);
  }, [sidebarCategories]);
  const displayCategoryIds = useMemo(
    () => displayCategories.map((c) => String(c.id)),
    [displayCategories]
  );
  const displayCategoryIdsKey = useMemo(
    () => displayCategoryIds.join("|"),
    [displayCategoryIds]
  );

  const jumpToCategory = (categoryId) => {
    const id = String(categoryId ?? "").trim();
    if (!id) return;
    const el = document.getElementById(`menu-cat-${id}`);
    if (!el) return;
    setActiveCategoryId(id);
    const offsetTop = el.getBoundingClientRect().top + window.scrollY - 170;
    window.scrollTo({
      top: Math.max(0, offsetTop),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!displayCategoryIds.length) {
      setActiveCategoryId(null);
      return;
    }
    setActiveCategoryId((prev) => prev || displayCategoryIds[0]);
  }, [displayCategoryIdsKey, displayCategoryIds]);

  useEffect(() => {
    if (!displayCategoryIds.length) return;
    let rafId = null;

    const getSections = () =>
      displayCategoryIds
        .map((id) => ({
          id,
          el: document.getElementById(`menu-cat-${id}`),
        }))
        .filter((s) => s.el);

    const updateActiveFromScroll = () => {
      const sections = getSections();
      if (!sections.length) return;

      // Compensates sticky header + category chips while choosing current section.
      const markerY = window.scrollY + 170;
      let currentId = sections[0].id;

      for (const section of sections) {
        const top = section.el.getBoundingClientRect().top + window.scrollY;
        if (top <= markerY) {
          currentId = section.id;
        } else {
          break;
        }
      }

      setActiveCategoryId((prev) => (prev === currentId ? prev : currentId));
    };

    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateActiveFromScroll();
      });
    };

    updateActiveFromScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [displayCategoryIdsKey, displayCategoryIds, searchTerm]);

  useEffect(() => {
    if (!activeCategoryId) return;
    const node = mobileCategoryRefs.current[activeCategoryId];
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCategoryId]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#menu-cat-")) return;
    const fromHash = hash.replace("#menu-cat-", "").trim();
    if (!fromHash) return;
    setActiveCategoryId(fromHash);
    const t = setTimeout(() => {
      jumpToCategory(fromHash);
    }, 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0908] text-white">
      <OrderTypeModal
        open={orderTypeModalOpen}
        onSelect={handleOrderTypeSelect}
        onClose={handleOrderTypeClose}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
        aria-hidden
      />
      <Header variant="marketing" />
      <main className="relative z-10 w-full px-0 py-5 pb-28 sm:px-4 md:py-8 md:pb-24 lg:px-8 xl:px-12">
        {showOrderingClosedBanner && (
          <div className="mx-auto mb-4 max-w-4xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-center sm:px-5">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/95">
              Ordering paused
            </p>
            <p className="mt-1 font-sans text-sm text-white/75">
              Orders can only be placed during opening hours. The menu below is for browsing only right now.
            </p>
          </div>
        )}
        {restaurant?.name && (
          <div className="mb-4 hidden text-center md:mb-7 md:block">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">Menus</p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-[0.01em] text-white md:text-3xl">
              {restaurant.name}
            </h1>
            {restaurant.cuisine && (
              <p className="mt-1 font-sans text-sm font-medium tracking-[0.02em] text-white/60">{restaurant.cuisine}</p>
            )}
          </div>
        )}

        {!menus || menus.length === 0 ? (
          <div className="border border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm">
            <p className="text-white/60">No menu available yet.</p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            {/* Mobile top bar: horizontal categories */}
            <div className="sticky top-14 z-40 w-full py-1 lg:hidden">
              <div className="overflow-x-auto bg-[#0a0908]/96 px-0 pb-1 pt-1 backdrop-blur-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-2">
                  {displayCategories.map((c) => {
                    const id = String(c.id);
                    const isActive = activeCategoryId === id;
                    return (
                      <button
                        key={`${c.id}-${c.depth}`}
                        ref={(node) => {
                          if (node) mobileCategoryRefs.current[id] = node;
                        }}
                        type="button"
                        onClick={() => jumpToCategory(id)}
                        className={[
                          "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                          isActive
                            ? "border-accent bg-accent text-wood-950"
                            : "border-white/20 bg-white/5 text-white/90 hover:border-accent hover:text-white",
                        ].join(" ")}
                        title={c.name}
                      >
                        {sentenceCase(c.name)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop sidebar */}
            <aside className="z-40 hidden space-y-4 lg:sticky lg:top-24 lg:block">
              <div className="bg-white/[0.04] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Search</h3>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  type="text"
                  placeholder="Search dish or description..."
                  className="mt-3 w-full rounded-sm border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-accent/50"
                />
                <p className="mt-3 text-xs text-white/50">Filters categories and special menus.</p>
              </div>

              <div className="max-h-[60vh] overflow-auto bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Categories</h3>
                <div className="mt-3 space-y-2">
                  {displayCategories.map((c) => {
                    const depth = Number.isFinite(Number(c?.depth)) ? Number(c.depth) : 0;
                    const id = String(c?.id ?? "");
                    const isActive = activeCategoryId === id;
                    const depthTypography =
                      depth === 0
                        ? "text-base font-extrabold tracking-[0.03em] uppercase"
                        : depth === 1
                          ? "text-sm font-bold tracking-[0.02em]"
                          : "text-xs font-semibold";

                    return (
                      <a
                        key={`${c.id}-${c.depth}`}
                        href={c.id ? `#menu-cat-${c.id}` : "#menu-categories"}
                        onClick={() => setActiveCategoryId(id)}
                        className={[
                          "block transition-colors",
                          depthTypography,
                          isActive ? "text-white" : "text-white/70 hover:text-accent",
                        ].join(" ")}
                        title={c.name}
                      >
                        <span className="inline-flex items-center" style={{ marginLeft: `${depth * 12}px` }}>
                          {depth > 0 ? <span className="mr-2 text-white/35">•</span> : null}
                          {sentenceCase(c.name)}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="space-y-6" id="menu-categories">
              {Array.isArray(specialMenuLists) && specialMenuLists.length > 0 &&
                specialMenuLists.map((sm) => (
                  <SpecialMenuSection
                    key={sm.id ?? sm.name ?? "special-menu"}
                    specialMenu={sm}
                    addItem={addItem}
                    orderingEnabled={orderingAccepting}
                    searchTerm={searchTerm}
                  />
                ))}

              {menus.map((menu, idx) => {
                const categories = Array.isArray(menu.categories)
                  ? menu.categories
                  : toArray(menu.categories || menu);
                const sortedCategories = [...categories].sort(sortBySortOrder);
                return (
                  <section
                    key={menu.id ?? menu.name ?? `menu-${idx}`}
                    className="overflow-hidden bg-white/[0.03] shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm"
                  >
                    <div className="divide-y divide-white/10">
                      {sortedCategories.map((category) => (
                        <div
                          key={category.id ?? category.name ?? Math.random()}
                          className="px-3 py-3.5 md:px-5 md:py-5"
                        >
                          <CategorySection
                            category={category}
                            addItem={addItem}
                            orderingEnabled={orderingAccepting}
                            searchTerm={searchTerm}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom bar: fixed search */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-[#0a0908] via-[#0a0908]/95 to-transparent px-0 pb-2 pt-5 sm:px-6 lg:hidden">
        <div className="bg-[#0a0908]/95 p-2.5 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Search</h3>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              placeholder="Search dish or description..."
              className="w-full rounded-sm bg-white/[0.06] px-3.5 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <p className="mt-1.5 text-[10px] text-white/50">Filters categories and special menus.</p>
        </div>
      </div>
    </div>
  );
}

