"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function ForgotPasswordForm() {
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shopId, setShopId] = useState("");
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shop") || "";

  useEffect(() => {
    const saved = localStorage.getItem("customer-theme");
    if (saved === "dark") setDark(true);
    if (shopSlug) {
      fetch("/api/shops?slug=" + shopSlug).then((r) => r.json()).then((d) => { if (d.id) setShopId(d.id); });
    }
  }, [shopSlug]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("customer-theme", next ? "dark" : "light");
  };

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

  const t = dark
    ? { bg: "#0a0a0a", card: "#141414", border: "#ffffff10", text: "#e8e4dd", label: "#888", inputBg: "#1a1a1a", inputBorder: "#ffffff15" }
    : { bg: "#ECECEC", card: "#fff", border: "#d4d4d4", text: "#1a1a1a", label: "#555", inputBg: "#fff", inputBorder: "#d4d4d4" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.text }}>
      <div style={{ position: "relative", background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 36, width: 380, boxShadow: dark ? "none" : "0 4px 24px rgba(0,0,0,0.07)" }}>
        <button onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
          {dark ? "☀️" : "🌙"}
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image src="/logo.png" alt="QueueUp" width={140} height={48} style={{ objectFit: "contain", filter: dark ? "brightness(0) invert(1)" : "none" }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "12px 0 4px", color: t.text }}>Forgot Password</h1>
          <p style={{ color: t.label, fontSize: 13 }}>Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ background: dark ? "#16a34a18" : "#f0fdf4", border: `1px solid ${dark ? "#16a34a40" : "#86efac"}`, borderRadius: 8, padding: "14px", textAlign: "center", color: dark ? "#4ade80" : "#166534", fontSize: 14 }}>
            If an account exists for that email, you'll receive a reset link shortly.
          </div>
        ) : (
          <>
            {error && <div style={{ background: dark ? "#ef444418" : "#fee2e2", border: `1px solid ${dark ? "#ef444440" : "#fca5a5"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: dark ? "#ef4444" : "#b91c1c", fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="you@email.com" style={{ background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: t.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: "#84934A", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: t.label }}>
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
