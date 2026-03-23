// 404 page — shown when a route doesn't exist
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#e8e4dd", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: 40 }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#84934A", marginBottom: 8 }}>404</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>Page not found</h1>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          style={{ display: "inline-block", background: "#84934A", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
