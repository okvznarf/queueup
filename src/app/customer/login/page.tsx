"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, color: dark ? "#e8e4dd" : "#555" }}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

function CustomerLoginForm() {
  const [dark, setDark] = useState<boolean | null>(null);
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
    const saved = localStorage.getItem("customer-theme");
    setDark(saved === "dark");
  }, []);

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

  if (dark === null) return null;

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("customer-theme", next ? "dark" : "light");
  };

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

  const t = dark
    ? { bg: "#0a0a0a", card: "#141414", border: "#ffffff10", text: "#e8e4dd", label: "#888", inputBg: "#1a1a1a", inputBorder: "#ffffff15", divider: "#ffffff10", dividerText: "#444" }
    : { bg: "#ECECEC", card: "#fff", border: "#d4d4d4", text: "#1a1a1a", label: "#555", inputBg: "#fff", inputBorder: "#d4d4d4", divider: "#e5e5e5", dividerText: "#aaa" };

  const accent = "#84934A";
  const shopName = shops.length > 0 ? shops[0].name : "";

  const inputStyle = { background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: t.text, width: "100%", boxSizing: "border-box" as const, outline: "none" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.text }}>
      <div style={{ position: "relative", background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 36, width: 380, minHeight: 600, boxShadow: dark ? "none" : "0 4px 24px rgba(0,0,0,0.07)" }}>
        <ThemeToggle dark={dark} onToggle={toggleTheme} />

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={dark ? "/logo-dark.png" : "/logo.png"} alt="QueueUp" style={{ width: 200, height: "auto", display: "block", margin: "0 auto" }} />
          {shopName && <div style={{ marginTop: 10, fontSize: 13, color: "#656D3F", fontWeight: 600 }}>{shopName}</div>}
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "10px 0 4px", color: t.text }}>{isRegister ? "Create Account" : "Customer Login"}</h1>
          <p style={{ color: t.label, fontSize: 13 }}>{isRegister ? "Sign up to manage your bookings" : "Sign in to view your appointments"}</p>
        </div>

        {error && <div style={{ background: dark ? "#ef444418" : "#fee2e2", border: `1px solid ${dark ? "#ef444440" : "#fca5a5"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: dark ? "#ef4444" : "#b91c1c", fontSize: 13 }}>{error}</div>}

        <button onClick={handleGoogle} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: dark ? "#1a1a1a" : "#fff", color: t.text, border: `1.5px solid ${t.border}`, borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: t.divider }} />
          <span style={{ color: t.dividerText, fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: t.divider }} />
        </div>

        {isRegister && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={inputStyle} />
        </div>

        {!isRegister && (
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <a href={`/customer/forgot-password${shopSlug ? `?shop=${shopSlug}` : ""}`} style={{ color: t.label, fontSize: 12, textDecoration: "none" }}>Forgot password?</a>
          </div>
        )}

        {isRegister && <div style={{ marginBottom: 20 }} />}

        <button onClick={handleSubmit} disabled={loading} style={{ background: accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: t.label }}>
          {isRegister ? "Already have an account? " : "Need an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {isRegister ? "Sign In" : "Register"}
          </button>
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
