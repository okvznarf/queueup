"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CustomerLoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shop") || "";
  const urlError = searchParams.get("error");

  useEffect(() => {
    if (shopSlug) {
      fetch("/api/shops?slug=" + shopSlug).then(r => r.json()).then(data => {
        if (data.id) { setSelectedShop(data.id); setShops([data]); }
      });
    }
    if (urlError === "google_cancelled") setError("Google sign-in was cancelled.");
    if (urlError === "google_failed") setError("Google sign-in failed. Please try again.");
    if (urlError === "no_email") setError("No email returned from Google.");
    if (urlError === "no_shop") setError("Shop not found.");
  }, [shopSlug, urlError]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const res = await fetch("/api/auth/register-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password, shopId: selectedShop }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); } else { router.push("/customer/dashboard"); }
      } else {
        const res = await fetch("/api/auth/login-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, shopId: selectedShop }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); } else { router.push("/customer/dashboard"); }
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  const handleGoogle = () => {
    window.location.href = `/api/auth/google?shop=${shopSlug}`;
  };

  const accent = "#C8A45A";
  const shopName = shops.length > 0 ? shops[0].name : "QueueUp";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e4dd" }}>
      <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 16, padding: 36, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: accent }}>{shopName}</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 4px" }}>{isRegister ? "Create Account" : "Customer Login"}</h1>
          <p style={{ color: "#666", fontSize: 14 }}>{isRegister ? "Sign up to manage your bookings" : "Sign in to view your appointments"}</p>
        </div>

        {error && <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>}

        {/* Google Sign-In */}
        <button onClick={handleGoogle} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: "#fff", color: "#111", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#ffffff10" }} />
          <span style={{ color: "#444", fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#ffffff10" }} />
        </div>

        {isRegister && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as const, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as const, outline: "none" }} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as const, outline: "none" }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as const, outline: "none" }} />
        </div>

        {!isRegister && (
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <a href={`/customer/forgot-password${shopSlug ? `?shop=${shopSlug}` : ""}`} style={{ color: "#666", fontSize: 12, textDecoration: "none" }}>Forgot password?</a>
          </div>
        )}

        {isRegister && <div style={{ marginBottom: 20 }} />}

        <button onClick={handleSubmit} disabled={loading} style={{ background: accent, color: "#111", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>{loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}</button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#666" }}>
          {isRegister ? "Already have an account? " : "Need an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{isRegister ? "Sign In" : "Register"}</button>
        </p>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense>
      <CustomerLoginForm />
    </Suspense>
  );
}
