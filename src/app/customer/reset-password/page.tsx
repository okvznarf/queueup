"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

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

  const inputStyle = {
    background: "#fff",
    border: "1.5px solid #d4d4d4",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    color: "#1a1a1a",
    width: "100%",
    boxSizing: "border-box" as const,
    outline: "none",
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#ECECEC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1a1a" }}>
      <div style={{ background: "#fff", border: "1px solid #d4d4d4", borderRadius: 16, padding: 36, width: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image src="/logo.png" alt="QueueUp" width={140} height={48} style={{ objectFit: "contain" }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "12px 0 4px", color: "#1a1a1a" }}>Set New Password</h1>
          <p style={{ color: "#888", fontSize: 13 }}>Choose a new password for your account</p>
        </div>

        {done ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "14px", textAlign: "center", color: "#166534", fontSize: 14 }}>
            Password updated! Redirecting to login...
          </div>
        ) : (
          <>
            {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>Confirm Password</label>
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
