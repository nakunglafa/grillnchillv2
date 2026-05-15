"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * Public pages: min-height column + language switcher + site footer.
 * Owner dashboard: children only so the marketing footer and flex “spacer” area are not shown.
 */
export function OwnerAwareSiteChrome({ restaurantName, socialLinks, children }) {
  const pathname = usePathname();
  const isOwnerRoute = pathname?.startsWith("/owner") ?? false;

  if (isOwnerRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {children}
      <LanguageSwitcher />
      <Footer restaurantName={restaurantName} socialLinks={socialLinks} />
    </div>
  );
}
