"use client";

import Link from "next/link";
import { useRef } from "react";
import { formatCurrencyEUR as formatPrice } from "@/lib/format-currency";

function DishCard({ dish }) {
  return (
    <article className="h-full">
      {dish.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dish.imageUrl}
          alt={dish.name}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : (
        <div
          className="flex aspect-[4/3] w-full items-end rounded-lg bg-white/5 p-4"
          aria-hidden
        >
          <span className="font-display text-2xl text-white/25">Grill N Chill</span>
        </div>
      )}
      <h4 className="mt-3 text-sm font-semibold text-white">{dish.name}</h4>
      {dish.blurb ? (
        <p className="mt-1 line-clamp-2 text-xs text-white/50">{dish.blurb}</p>
      ) : null}
      {dish.price != null && dish.price !== "" ? (
        <p className="mt-2 text-sm font-semibold text-accent">{formatPrice(dish.price)}</p>
      ) : null}
    </article>
  );
}

function CategoryCarousel({ category }) {
  const ref = useRef(null);

  function scrollBy(dir) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(280, el.clientWidth * 0.75), behavior: "smooth" });
  }

  return (
    <div className="border-t border-white/10 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold">{category.categoryName}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="rounded-md border border-white/20 px-2.5 py-1 text-sm text-white/70 hover:border-white/40"
            aria-label={`Previous ${category.categoryName}`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="rounded-md border border-white/20 px-2.5 py-1 text-sm text-white/70 hover:border-white/40"
            aria-label={`Next ${category.categoryName}`}
          >
            →
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={category.categoryName}
      >
        {category.dishes.map((dish) => (
          <div key={dish.id} className="w-[min(100%,15rem)] shrink-0 snap-start">
            <DishCard dish={dish} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LocationCategoryFavorites({ categories, venueName, menuHref }) {
  if (!categories?.length) return null;

  return (
    <section id="favorites" className="border-b border-white/10 py-12" aria-labelledby="favorites-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="favorites-heading" className="font-display text-2xl font-semibold sm:text-3xl">
              Favourites at {venueName}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              A taste of the first categories on the menu — open the full menu to order.
            </p>
          </div>
          <Link
            href={menuHref}
            className="text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Full menu →
          </Link>
        </div>
        <div className="mt-8 flex flex-col gap-2">
          {categories.map((cat) => (
            <CategoryCarousel key={cat.categoryId} category={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}
