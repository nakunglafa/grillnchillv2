const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

export const metadata = {
  title: "Menu",
  description: `Explore ${BRAND} menus across Lisbon.`,
  robots: { index: false, follow: true },
};

export default function MenuLayout({ children }) {
  return children;
}
