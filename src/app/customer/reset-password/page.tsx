"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const rpCss = `
@keyframes rp-scale-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
@keyframes rp-fade-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.rp-card{animation:rp-scale-in 0.5s cubic-bezier(0.16,1,0.3,1) both}
.rp-btn{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.rp-btn:hover:not(:disabled){transform:translateY(-1px)}
.rp-btn:active:not(:disabled){transform:scale(0.98)}
.rp-input{transition:border-color 0.25s ease,box-shadow 0.25s ease}
.rp-input:focus{outline:none}
.rp-theme-btn{transition:all 0.25s ease}
.rp-theme-btn:hover{transform:scale(1.1)}
`;

function ResetPasswordForm() {
  const [dark, setDark] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const shopSlug = searchParams.get("shop") || "";
  const accent = "#84934A";

  useEffect(() => {
    const saved = localStorage.getItem("customer-theme");
    setDark(saved === "dark");
  }, []);

  if (dark === null) return null;

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

  const inputStyle: React.CSSProperties = { background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: t.text, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = "none"; };

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.text, position: "relative", overflow: "hidden" }}>
      <style dangerouslySetInnerHTML={{__html: rpCss}} />
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div className="rp-card" style={{ position: "relative", background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: "36px 32px", width: 380, minHeight: 600, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.08)" }}>
        <button onClick={toggleTheme} className="rp-theme-btn" title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ position: "absolute", top: 18, right: 18, background: "transparent", border: "none", cursor: "pointer", padding: 6, lineHeight: 1, color: dark ? "#e8e4dd" : "#555", borderRadius: 8 }}>
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={dark ? "/logo-dark.png" : "/logo.png"} alt="QueueUp" style={{ height: 120, width: "auto", display: "block", margin: "0 auto" }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "14px 0 4px", color: t.text, letterSpacing: "-0.02em" }}>Set New Password</h1>
          <p style={{ color: t.label, fontSize: 13, lineHeight: 1.5 }}>Choose a new password for your account</p>
        </div>

        {done ? (
          <div style={{ background: dark ? "#16a34a18" : "#f0fdf4", border: `1px solid ${dark ? "#16a34a40" : "#86efac"}`, borderRadius: 12, padding: "16px", textAlign: "center", color: dark ? "#4ade80" : "#166534", fontSize: 14, animation: "rp-fade-in 0.4s ease" }}>
            Password updated! Redirecting to login...
          </div>
        ) : (
          <>
            {error && <div style={{ background: dark ? "#ef444418" : "#fee2e2", border: `1px solid ${dark ? "#ef444440" : "#fca5a5"}`, borderRadius: 10, padding: "11px 16px", marginBottom: 16, color: dark ? "#ef4444" : "#b91c1c", fontSize: 13, fontWeight: 500, animation: "rp-fade-in 0.3s ease" }}>{error}</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="rp-input" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: t.label, display: "block", marginBottom: 7, fontWeight: 500 }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="Repeat password" className="rp-input" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
            <button onClick={handleSubmit} disabled={loading} className="rp-btn" style={{ background: `linear-gradient(135deg, ${accent}, #656D3F)`, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1, fontFamily: "inherit", boxShadow: `0 4px 16px ${accent}30` }}>
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
