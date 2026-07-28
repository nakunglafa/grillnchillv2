const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");

export default function Head() {
  const title = "Menu | Grill N Chill Lisbon";
  const description =
    "Browse Grill N Chill menus in Lisbon — Praça do Chile, Intendente, and bakery café.";
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${SITE_URL}/menu`} />
      <meta
        name="keywords"
        content="Grill N Chill menu, restaurant Lisbon, Nepali food Lisbon, Portuguese cuisine, Indian restaurant Lisbon"
      />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${SITE_URL}/menu`} />
      <meta property="og:site_name" content="Grill N Chill" />
      <meta property="og:type" content="website" />
    </>
  );
}
