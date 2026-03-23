"use client";

// Route-level error boundary — catches errors in page components
// Shows a clean fallback instead of crashing the page
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ef444418", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h2>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          This page encountered an error. You can try again or go back.
        </p>
        {error.digest && (
          <p style={{ color: "#666", fontSize: 12, marginBottom: 12 }}>
            Reference: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{ background: "#84934A", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
