"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

function ResetPasswordForm() {
  const [dark, setDark] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const shopSlug = searchParams.get("shop") || "";

  useEffect(() => {
    const saved = localStorage.getItem("customer-theme");
    if (saved === "dark") setDark(true);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("customer-theme", next ? "dark" : "light");
  };

  const handleSubmit = async () => {
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); }
      else {
        setDone(true);
        setTimeout(() => router.push(`/customer/login${shopSlug ? `?shop=${shopSlug}` : ""}`), 2000);
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const t = dark
    ? { bg: "#0a0a0a", card: "#141414", border: "#ffffff10", text: "#e8e4dd", label: "#888", inputBg: "#1a1a1a", inputBorder: "#ffffff15" }
    : { bg: "#ECECEC", card: "#fff", border: "#d4d4d4", text: "#1a1a1a", label: "#555", inputBg: "#fff", inputBorder: "#d4d4d4" };

  const inputStyle = { background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: t.text, width: "100%", boxSizing: "border-box" as const, outline: "none" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.text }}>
      <div style={{ position: "relative", background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 36, width: 380, boxShadow: dark ? "none" : "0 4px 24px rgba(0,0,0,0.07)" }}>
        <button onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
          {dark ? "☀️" : "🌙"}
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image src="/logo.png" alt="QueueUp" width={140} height={48} style={{ objectFit: "contain", filter: dark ? "brightness(0) invert(1)" : "none" }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "12px 0 4px", color: t.text }}>Set New Password</h1>
          <p style={{ color: t.label, fontSize: 13 }}>Choose a new password for your account</p>
        </div>

        {done ? (
          <div style={{ background: dark ? "#16a34a18" : "#f0fdf4", border: `1px solid ${dark ? "#16a34a40" : "#86efac"}`, borderRadius: 8, padding: "14px", textAlign: "center", color: dark ? "#4ade80" : "#166534", fontSize: 14 }}>
            Password updated! Redirecting to login...
          </div>
        ) : (
          <>
            {error && <div style={{ background: dark ? "#ef444418" : "#fee2e2", border: `1px solid ${dark ? "#ef444440" : "#fca5a5"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: dark ? "#ef4444" : "#b91c1c", fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="Repeat password" style={inputStyle} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: "#84934A", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Saving..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
