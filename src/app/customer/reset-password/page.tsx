"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const shopSlug = searchParams.get("shop") || "";
  const accent = "#C8A45A";

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

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e4dd" }}>
      <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 16, padding: 36, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: accent }}>QueueUp</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 4px" }}>Set New Password</h1>
          <p style={{ color: "#666", fontSize: 14 }}>Choose a new password for your account</p>
        </div>

        {done ? (
          <div style={{ background: "#16a34a18", border: "1px solid #16a34a40", borderRadius: 8, padding: "14px", textAlign: "center", color: "#4ade80", fontSize: 14 }}>
            Password updated! Redirecting to login...
          </div>
        ) : (
          <>
            {error && <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="Repeat password" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box", outline: "none" }} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ background: accent, color: "#111", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
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
