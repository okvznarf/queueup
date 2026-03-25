"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const loginCss = `
@keyframes cl-fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes cl-scale-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
.cl-card{animation:cl-scale-in 0.5s cubic-bezier(0.16,1,0.3,1) both}
.cl-btn{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.cl-btn:hover:not(:disabled){transform:translateY(-1px)}
.cl-btn:active:not(:disabled){transform:scale(0.98)}
.cl-input{transition:border-color 0.25s ease,box-shadow 0.25s ease}
.cl-input:focus{outline:none}
.cl-link{transition:color 0.2s ease,opacity 0.2s ease}
.cl-link:hover{opacity:0.8}
.cl-google{transition:all 0.25s ease}
.cl-google:hover{transform:translateY(-1px)}
.cl-theme-btn{transition:all 0.25s ease}
.cl-theme-btn:hover{transform:scale(1.1)}
`;

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="cl-theme-btn" title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ position: "absolute", top: 18, right: 18, background: "transparent", border: "none", cursor: "pointer", padding: 6, lineHeight: 1, color: dark ? "#e8e4dd" : "#555", borderRadius: 8 }}>
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

  const inputStyle: React.CSSProperties = { background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: t.text, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = "none"; };

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.text, position: "relative", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{__html: loginCss}} />
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle, ${dark ? "#ffffff05" : "#49282808"} 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div className="cl-card" style={{ position: "relative", background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: "28px 32px", width: 370, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.08)" }}>
        <ThemeToggle dark={dark} onToggle={toggleTheme} />

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={dark ? "/logo-dark.png" : "/logo.png"} alt="QueueUp" style={{ height: 300, width: "auto", display: "block", margin: "0 auto" }} />
          {shopName && <div style={{ marginTop: 10, fontSize: 18, color: "#656D3F", fontWeight: 700 }}>{shopName}</div>}
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 4px", color: t.text, letterSpacing: "-0.02em" }}>{isRegister ? "Create Account" : "Customer Login"}</h1>
          <p style={{ color: t.label, fontSize: 13, lineHeight: 1.5 }}>{isRegister ? "Sign up to manage your bookings" : "Sign in to view your appointments"}</p>
        </div>

        {error && <div style={{ background: dark ? "#ef444418" : "#fee2e2", border: `1px solid ${dark ? "#ef444440" : "#fca5a5"}`, borderRadius: 10, padding: "11px 16px", marginBottom: 16, color: dark ? "#ef4444" : "#b91c1c", fontSize: 13, fontWeight: 500, animation: "cl-fade-in 0.3s ease" }}>{error}</div>}

        <button onClick={handleGoogle} className="cl-google" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: dark ? "#1a1a1a" : "#fff", color: t.text, border: `1.5px solid ${t.border}`, borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, fontFamily: "inherit", boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.05)" }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: t.divider }} />
          <span style={{ color: t.dividerText, fontSize: 12, fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: t.divider }} />
        </div>

        {isRegister && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="cl-input" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="cl-input" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="cl-input" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} className="cl-input" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
        </div>

        {!isRegister && (
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <a href={`/customer/forgot-password${shopSlug ? `?shop=${shopSlug}` : ""}`} className="cl-link" style={{ color: t.label, fontSize: 12, textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
          </div>
        )}

        {isRegister && <div style={{ marginBottom: 20 }} />}

        <button onClick={handleSubmit} disabled={loading} className="cl-btn" style={{ background: `linear-gradient(135deg, ${accent}, #656D3F)`, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1, fontFamily: "inherit", boxShadow: `0 4px 16px ${accent}30` }}>
          {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
        </button>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: t.label }}>
          {isRegister ? "Already have an account? " : "Need an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
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
