"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const fpCss = `
@keyframes fp-scale-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
@keyframes fp-fade-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.fp-card{animation:fp-scale-in 0.5s cubic-bezier(0.16,1,0.3,1) both}
.fp-btn{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.fp-btn:hover:not(:disabled){transform:translateY(-1px)}
.fp-btn:active:not(:disabled){transform:scale(0.98)}
.fp-input{transition:border-color 0.25s ease,box-shadow 0.25s ease}
.fp-input:focus{outline:none}
.fp-theme-btn{transition:all 0.25s ease}
.fp-theme-btn:hover{transform:scale(1.1)}
`;

function ForgotPasswordForm() {
  const [dark, setDark] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shopId, setShopId] = useState("");
  const searchParams = useSearchParams();
  const shopSlug = searchParams.get("shop") || "";
  const accent = "#84934A";

  useEffect(() => {
    const saved = localStorage.getItem("customer-theme");
    setDark(saved === "dark");
    if (shopSlug) {
      fetch("/api/shops?slug=" + shopSlug).then((r) => r.json()).then((d) => { if (d.id) setShopId(d.id); });
    }
  }, [shopSlug]);

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
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shopId: shopId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error);
      else setSent(true);
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const t = dark
    ? { bg: "#0a0a0a", card: "#141414", border: "#ffffff10", text: "#e8e4dd", label: "#888", inputBg: "#1a1a1a", inputBorder: "#ffffff15" }
    : { bg: "#ECECEC", card: "#fff", border: "#d4d4d4", text: "#1a1a1a", label: "#555", inputBg: "#fff", inputBorder: "#d4d4d4" };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = "none"; };

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.text, position: "relative", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{__html: fpCss}} />
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div className="fp-card" style={{ position: "relative", background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: "36px 32px", width: 380, minHeight: 600, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.08)" }}>
        <button onClick={toggleTheme} className="fp-theme-btn" title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ position: "absolute", top: 18, right: 18, background: "transparent", border: "none", cursor: "pointer", padding: 6, lineHeight: 1, color: dark ? "#e8e4dd" : "#555", borderRadius: 8 }}>
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={dark ? "/logo-dark.png" : "/logo.png"} alt="QueueUp" style={{ height: 120, width: "auto", display: "block", margin: "0 auto" }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "14px 0 4px", color: t.text, letterSpacing: "-0.02em" }}>Forgot Password</h1>
          <p style={{ color: t.label, fontSize: 13, lineHeight: 1.5 }}>Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div style={{ background: dark ? "#16a34a18" : "#f0fdf4", border: `1px solid ${dark ? "#16a34a40" : "#86efac"}`, borderRadius: 12, padding: "16px", textAlign: "center", color: dark ? "#4ade80" : "#166534", fontSize: 14, animation: "fp-fade-in 0.4s ease" }}>
            If an account exists for that email, you'll receive a reset link shortly.
          </div>
        ) : (
          <>
            {error && <div style={{ background: dark ? "#ef444418" : "#fee2e2", border: `1px solid ${dark ? "#ef444440" : "#fca5a5"}`, borderRadius: 10, padding: "11px 16px", marginBottom: 16, color: dark ? "#ef4444" : "#b91c1c", fontSize: 13, fontWeight: 500, animation: "fp-fade-in 0.3s ease" }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="you@email.com" className="fp-input" style={{ background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: t.text, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} onFocus={focusInput} onBlur={blurInput} />
            </div>
            <button onClick={handleSubmit} disabled={loading} className="fp-btn" style={{ background: `linear-gradient(135deg, ${accent}, #656D3F)`, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1, fontFamily: "inherit", boxShadow: `0 4px 16px ${accent}30` }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: t.label }}>
          <a href={`/customer/login${shopSlug ? `?shop=${shopSlug}` : ""}`} style={{ color: accent, textDecoration: "none", fontWeight: 600 }}>Back to login</a>
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
