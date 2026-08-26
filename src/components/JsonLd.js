/**
 * Server-rendered JSON-LD. Prefer this over next/script afterInteractive so
 * the graph is in the first HTML Googlebot receives.
 */
export function JsonLd({ data, id }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
