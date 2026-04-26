const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://restaurant.digitallisbon.pt").replace(/\/$/, "");

export default function Head() {
  const title = "Book a Table | Thai and Sushi Restaurant in Almancil, Faro, Algarve";
  const description =
    "Reserve your table at Thai Maki in Almancil near Faro, Algarve. Ideal for users searching thai or sushi restaurant near me.";
  const canonical = `${SITE_URL}/book`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content="book table Thai Maki, thai restaurant Faro, thai restaurant Almancil, thai restaurant Algarve, sushi restaurant Faro, sushi restaurant Almancil, sushi restaurant Algarve, thai restaurant near me, sushi restaurant near me"
      />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content="Thai Maki" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    </>
  );
}

