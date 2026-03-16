"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shopId, setShopId] = useState("");
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shop") || "";

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
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#ECECEC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1a1a" }}>
      <div style={{ background: "#fff", border: "1px solid #d4d4d4", borderRadius: 16, padding: 36, width: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image src="/logo.png" alt="QueueUp" width={140} height={48} style={{ objectFit: "contain" }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "12px 0 4px", color: "#1a1a1a" }}>Forgot Password</h1>
          <p style={{ color: "#888", fontSize: 13 }}>Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "14px", textAlign: "center", color: "#166534", fontSize: 14 }}>
            If an account exists for that email, you'll receive a reset link shortly.
          </div>
        ) : (
          <>
            {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="you@email.com" style={{ background: "#fff", border: "1.5px solid #d4d4d4", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#1a1a1a", width: "100%", boxSizing: "border-box", outline: "none" }} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: "#84934A", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#888" }}>
          <a href={`/customer/login${shopSlug ? `?shop=${shopSlug}` : ""}`} style={{ color: "#84934A", textDecoration: "none", fontWeight: 600 }}>Back to login</a>
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
