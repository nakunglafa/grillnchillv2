const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");

export default function Head() {
  const title = "Reserve a Table | Grill N Chill Lisbon";
  const description =
    "Reserve your table at Grill N Chill in Lisbon. Choose Praça do Chile, Intendente, or bakery café.";
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${SITE_URL}/book`} />
      <meta
        name="keywords"
        content="book table Grill N Chill, restaurant Lisbon, reserve table Praça do Chile, Intendente"
      />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${SITE_URL}/book`} />
      <meta property="og:site_name" content="Grill N Chill" />
      <meta property="og:type" content="website" />
    </>
  );
}
