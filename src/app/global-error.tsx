"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0A0A0A", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem" }}>
          <div style={{ maxWidth: "400px", textAlign: "center" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.5rem" }}>
              System Error
            </h2>
            <p style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", marginBottom: "1rem" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.6rem", color: "#555", marginBottom: "1rem" }}>
                REF: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                backgroundColor: "#7c3aed",
                color: "#fff",
                border: "none",
                padding: "0.75rem 1.5rem",
                cursor: "pointer",
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: "0.875rem",
              }}
            >
              RETRY
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
