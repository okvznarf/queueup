"use client";
import { useState } from "react";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const accent = "#C8A45A";
  const inputStyle = { background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as const, outline: "none" };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setSent(true);
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e4dd" }}>
      <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 16, padding: 36, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 2, color: accent }}>QUEUEUP</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 4px" }}>Forgot Password</h1>
          <p style={{ color: "#666", fontSize: 14 }}>Enter your email to receive a reset link</p>
        </div>

        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>
        )}

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "#22c55e18", border: "1px solid #22c55e40", borderRadius: 8, padding: "14px", marginBottom: 20, color: "#22c55e", fontSize: 14 }}>
              If an account with that email exists, a reset link has been sent.
            </div>
            <a href="/admin/login" style={{ color: accent, fontSize: 13, textDecoration: "none" }}>Back to Login</a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={inputStyle} />
            </div>

            <button onClick={handleSubmit} disabled={loading} style={{ background: accent, color: "#111", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Please wait..." : "Send Reset Link"}
            </button>

            <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#666" }}>
              <a href="/admin/login" style={{ color: accent, textDecoration: "none" }}>Back to Login</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
