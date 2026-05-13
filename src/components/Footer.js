import Link from "next/link";
import { FooterCookiePrefsButton } from "@/components/FooterCookiePrefsButton";

/**
 * Minimal centered footer — brand, social row, copyright.
 */
export function Footer({ restaurantName = "Restaurant", socialLinks }) {
  const year = new Date().getFullYear();
  const brand = restaurantName.trim().toUpperCase();

  const items = [
    { label: "Facebook", href: socialLinks?.facebook?.trim() || null },
    { label: "Instagram", href: socialLinks?.instagram?.trim() || null },
    { label: "Trip advisor", href: socialLinks?.tripadvisor?.trim() || null },
  ];

  return (
    <footer className="mt-auto bg-[#0a0908] py-16 text-center md:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p
          className="notranslate font-sans text-4xl font-bold uppercase tracking-[0.12em] text-white md:text-5xl md:tracking-[0.16em]"
          translate="no"
        >
          {brand}
        </p>

        <nav
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10 md:gap-x-12"
          aria-label="Social links"
        >
          {items.map(({ label, href }) =>
            href ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c49a6c] transition-colors hover:text-accent"
              >
                {label}
              </a>
            ) : (
              <span
                key={label}
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c49a6c]/35"
              >
                {label}
              </span>
            )
          )}
        </nav>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-white/45">
          <Link
            href="/privacy"
            className="transition-colors hover:text-white/80"
          >
            Privacy
          </Link>
          <FooterCookiePrefsButton />
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-white/40 md:text-[13px]">
          © {year} <span className="notranslate" translate="no">{restaurantName}</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
