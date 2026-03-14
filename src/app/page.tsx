export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e4dd", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: 6, color: "#C8A45A", marginBottom: 8 }}>QUEUEUP</div>
        <p style={{ fontSize: 15, marginBottom: 48, background: "linear-gradient(90deg, #C8A45A, #e8c97a, #C8A45A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 500, letterSpacing: 1 }}>Appointment booking for modern businesses</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a href="/booking/sharp-and-co" style={cardStyle("#C8A45A")}>
            <span style={{ fontWeight: 700 }}>Sharp & Co.</span>
            <span style={{ fontSize: 13, color: "#888" }}>Barber Shop → Book</span>
          </a>
          <a href="/booking/ember-and-oak" style={cardStyle("#D4644E")}>
            <span style={{ fontWeight: 700 }}>Ember & Oak</span>
            <span style={{ fontSize: 13, color: "#888" }}>Restaurant → Reserve</span>
          </a>
          <a href="/booking/iron-works-auto" style={cardStyle("#4A9EE5")}>
            <span style={{ fontWeight: 700 }}>Iron Works Auto</span>
            <span style={{ fontSize: 13, color: "#888" }}>Mechanic → Schedule</span>
          </a>
        </div>

        <div style={{ marginTop: 48, display: "flex", gap: 16, justifyContent: "center" }}>
          <a href="/admin/login" style={{ fontSize: 13, color: "#C8A45A", textDecoration: "none", border: "1px solid #C8A45A40", borderRadius: 8, padding: "8px 20px", fontWeight: 600, letterSpacing: 1 }}>Business Login</a>
        </div>
      </div>
    </div>
  );
}

function cardStyle(color: string): React.CSSProperties {
  return {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#141414", border: "1px solid #ffffff10", borderRadius: 12,
    padding: "16px 20px", textDecoration: "none", color: "#e8e4dd",
    borderLeft: "3px solid " + color,
  };
}
