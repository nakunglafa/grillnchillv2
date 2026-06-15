"use client";

import { useState } from "react";
import { ayceLunchContent } from "@/data/all-you-can-eat-lunch";

function BilingualItemCard({ item }) {
  return (
    <article className="rounded-sm border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.06]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-sans text-[15px] font-semibold leading-snug text-white">
          <span className="notranslate" translate="no">{item.namePt}</span>
          <span className="mx-1.5 font-normal text-white/35">/</span>
          <span className="font-medium text-white/90">{item.nameEn}</span>
        </h4>
        {item.badge ? (
          <span className="shrink-0 rounded-sm bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            {item.badge}
          </span>
        ) : null}
      </div>
      {item.subtitle ? (
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          {item.subtitle}
        </p>
      ) : null}
      {item.descPt ? (
        <p className="mt-2 text-[12px] leading-relaxed text-white/55">{item.descPt}</p>
      ) : null}
      {item.descEn ? (
        <p className="mt-1 text-[13px] leading-relaxed text-white/75">{item.descEn}</p>
      ) : null}
      {item.inside ? (
        <p className="mt-2 text-[12px] text-white/65">
          <span className="font-semibold uppercase tracking-[0.1em] text-white/45">Inside </span>
          {item.inside}
        </p>
      ) : null}
      {item.outside ? (
        <p className="mt-1 text-[12px] text-white/65">
          <span className="font-semibold uppercase tracking-[0.1em] text-white/45">Outside </span>
          {item.outside}
        </p>
      ) : null}
    </article>
  );
}

function CategoryAccordion({ category, defaultOpen = false }) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] open:bg-white/[0.04]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5 sm:py-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="font-sans text-base font-bold text-white sm:text-lg">
            {category.titlePt}
            <span className="ml-2 font-normal text-white/50">/ {category.titleEn}</span>
          </h3>
          {category.subtitle ? (
            <p className="mt-0.5 text-[12px] text-white/55">{category.subtitle}</p>
          ) : null}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-transform group-open:rotate-180">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-white/10 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {category.items.map((item) => (
            <BilingualItemCard key={`${category.id}-${item.nameEn}`} item={item} />
          ))}
        </div>
      </div>
    </details>
  );
}

export function RodizioMenuExplorer() {
  const [track, setTrack] = useState("thai");
  const { starters, thaiMains, sushiMains, dietary } = ayceLunchContent;
  const activeCategories = track === "thai" ? thaiMains : sushiMains;

  return (
    <div className="space-y-10">
      {/* Starters — always first */}
      <section id="entradas" aria-label="Starters">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-accent/90 sm:w-14" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            {starters.titlePt} / {starters.titleEn}
          </p>
        </div>
        <h2 className="font-display mt-3 text-xl font-semibold text-white sm:text-2xl">
          Start with starters
        </h2>
        <p className="mt-2 text-[14px] text-white/65">
          Included in rodizio — begin with our entrées before choosing Thai or sushi mains.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {starters.items.map((item) => (
            <BilingualItemCard key={item.nameEn} item={item} />
          ))}
        </div>
      </section>

      {/* Dietary note */}
      <section
        aria-label="Spice levels and dietary information"
        className="rounded-sm border border-white/10 bg-white/[0.04] p-5 sm:p-6"
      >
        <p className="text-[13px] leading-relaxed text-white/70">{dietary.notePt}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/85">{dietary.noteEn}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {dietary.spiceLevels.map((level) => (
            <span
              key={level.en}
              className="rounded-sm border border-accent/25 bg-accent/10 px-3 py-1.5 text-[11px] font-medium text-accent"
            >
              {level.pt} / {level.en}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-white/60">{dietary.vegetarianPt}</p>
        <p className="mt-1 text-[13px] text-white/75">{dietary.vegetarianEn}</p>
      </section>

      {/* Main courses — Thai or Sushi */}
      <section aria-label="Main courses">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-accent/90 sm:w-14" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            Pratos principais / Main courses
          </p>
        </div>
        <h2 className="font-display mt-3 text-xl font-semibold text-white sm:text-2xl">
          Choose your mains
        </h2>
        <p className="mt-2 text-[14px] text-white/65">
          Mix freely from Thai and sushi during your rodizio — browse by category below.
        </p>

        <div
          className="mt-6 inline-flex w-full max-w-md rounded-sm border border-white/15 bg-white/[0.04] p-1 sm:w-auto"
          role="tablist"
          aria-label="Main course type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={track === "thai"}
            onClick={() => setTrack("thai")}
            className={`flex-1 rounded-sm px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:flex-none sm:px-8 ${
              track === "thai"
                ? "bg-accent text-wood-950"
                : "text-white/70 hover:text-white"
            }`}
          >
            Thai
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={track === "sushi"}
            onClick={() => setTrack("sushi")}
            className={`flex-1 rounded-sm px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:flex-none sm:px-8 ${
              track === "sushi"
                ? "bg-accent text-wood-950"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sushi
          </button>
        </div>

        <div className="mt-6 space-y-4" role="tabpanel">
          {activeCategories.map((category, index) => (
            <CategoryAccordion key={category.id} category={category} defaultOpen={index === 0} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function PricingBanner() {
  const { pricing } = ayceLunchContent;
  return (
    <section
      aria-label="Rodizio pricing"
      className="grid gap-4 sm:grid-cols-2"
    >
      {pricing.map((tier) => (
        <div
          key={tier.labelEn}
          className="flex items-center justify-between rounded-sm border border-accent/35 bg-accent/10 px-5 py-4 sm:px-6 sm:py-5"
        >
          <div>
            <p className="text-[14px] font-semibold text-white">{tier.labelPt}</p>
            <p className="mt-0.5 text-[12px] text-white/65">{tier.labelEn}</p>
          </div>
          <p className="font-display text-2xl font-semibold text-accent sm:text-3xl">{tier.price}</p>
        </div>
      ))}
    </section>
  );
}
