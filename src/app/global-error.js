"use client";

/**
 * Required App Router global error UI. Also gives Next a real /_global-error
 * page to prerender instead of the fragile internal fallback (Next 16 bug).
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0908",
          color: "#f5f0e8",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, margin: "0 0 20px", fontSize: 14 }}>
            {error?.digest ? `Reference: ${error.digest}` : "Please try again."}
          </p>
          <button
            type="button"
            onClick={() => (typeof reset === "function" ? reset() : window.location.reload())}
            style={{
              border: 0,
              borderRadius: 8,
              background: "#c59d5f",
              color: "#1a1510",
              fontWeight: 600,
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
