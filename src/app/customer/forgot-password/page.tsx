"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shop") || "";
  const [shopId, setShopId] = useState("");
  const accent = "#C8A45A";

  useEffect(() => {
    if (shopSlug) {
      fetch("/api/shops?slug=" + shopSlug)
        .then((r) => r.json())
        .then((d) => { if (d.id) setShopId(d.id); });
    }
  }, [shopSlug]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shopId }),
      });
      setSent(true);
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e4dd" }}>
      <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 16, padding: 36, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: accent }}>QueueUp</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 4px" }}>Forgot Password</h1>
          <p style={{ color: "#666", fontSize: 14 }}>Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ background: "#16a34a18", border: "1px solid #16a34a40", borderRadius: 8, padding: "14px", textAlign: "center", color: "#4ade80", fontSize: 14 }}>
            If an account exists for that email, you'll receive a reset link shortly.
          </div>
        ) : (
          <>
            {error && <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="you@email.com" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box", outline: "none" }} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: accent, color: "#111", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#666" }}>
          <a href={`/customer/login${shopSlug ? `?shop=${shopSlug}` : ""}`} style={{ color: accent, textDecoration: "none" }}>Back to login</a>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
