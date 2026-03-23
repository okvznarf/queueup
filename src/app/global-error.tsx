"use client";

// Global error boundary — catches unhandled errors in the root layout
// This is the last line of defense before the user sees a white screen
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0a", color: "#e8e4dd", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 440, padding: 40 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>500</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{ background: "#84934A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
