/**
 * Build Soul & Sip–style category favorites from Digitallisbon menus:
 * first 4 categories (with items) × up to 4 dishes each.
 *
 * Digitallisbon menus nest items under category.children — parents often have
 * items: [] and only subcategories hold dishes. image_url is often null.
 */

function sortByOrder(a, b) {
  const ao = typeof a?.sort_order === "number" ? a.sort_order : 9999;
  const bo = typeof b?.sort_order === "number" ? b.sort_order : 9999;
  return ao - bo;
}

function itemImageUrl(item) {
  return (
    item?.image_url ||
    item?.imageUrl ||
    item?.photo_url ||
    item?.photoUrl ||
    item?.category?.image_url ||
    null
  );
}

/** Collect categories that have available items (walk nested children). */
function collectCategoriesWithItems(categories, out = []) {
  const list = Array.isArray(categories) ? [...categories].sort(sortByOrder) : [];
  for (const cat of list) {
    if (!cat) continue;
    const items = Array.isArray(cat.items)
      ? cat.items.filter((i) => i && i.is_available !== false)
      : [];
    if (items.length > 0) {
      out.push({ ...cat, items });
    }
    const children = cat.children || cat.child_categories || [];
    if (Array.isArray(children) && children.length) {
      collectCategoriesWithItems(children, out);
    }
  }
  return out;
}

function flattenMenusToCategories(menus) {
  const out = [];
  for (const menu of menus || []) {
    collectCategoriesWithItems(menu?.categories, out);
  }
  return out;
}

/**
 * @param {unknown[]} menus
 * @returns {{ categoryId: string|number, categoryName: string, dishes: object[] }[]}
 */
export function buildLocationFavorites(menus, { maxCategories = 4, maxDishes = 4 } = {}) {
  const categories = flattenMenusToCategories(menus).slice(0, maxCategories);
  const result = [];

  for (const cat of categories) {
    const items = Array.isArray(cat.items) ? [...cat.items].sort(sortByOrder) : [];
    const dishes = [];
    for (const item of items) {
      if (item?.is_available === false) continue;
      dishes.push({
        id: item.id,
        name: item.name || "Dish",
        blurb: item.description || item.short_description || "",
        imageUrl: itemImageUrl(item) || cat.image_url || cat.imageUrl || null,
        price: item.price,
      });
      if (dishes.length >= maxDishes) break;
    }
    if (dishes.length === 0) continue;
    result.push({
      categoryId: cat.id ?? cat.name,
      categoryName: cat.name || "Menu",
      dishes,
    });
  }

  return result;
}
