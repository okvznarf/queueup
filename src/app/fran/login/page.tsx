"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"login" | "verify">("login");
  const [userId, setUserId] = useState("");
  const router = useRouter();

  const s = {
    bg: "#0a0a0a", card: "#141414", border: "#ffffff10", text: "#e8e4dd",
    muted: "#888", accent: "#84934A", input: "#1a1a1a", inputBorder: "#ffffff15",
  };

  const inputStyle = { background: s.input, border: `1.5px solid ${s.inputBorder}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box" as const, outline: "none" };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/superadmin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, step: "login" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); }
      else if (data.requires2FA) {
        setUserId(data.userId);
        setStep("verify");
      }
    } catch { setError("Connection error"); }
    setLoading(false);
  };

  const handleVerify = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/superadmin/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, step: "verify" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid code"); }
      else { router.push("/fran/dashboard"); }
    } catch { setError("Connection error"); }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "system-ui", background: s.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: s.text }}>
      <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 16, padding: "32px", width: 380 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>Superadmin Login</h1>
        {error && <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>}

        {step === "login" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} style={inputStyle} />
            </div>
            <button onClick={handleLogin} disabled={loading} style={{ background: s.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </>
        )}

        {step === "verify" && (
          <>
            <div style={{ fontSize: 14, color: s.muted, marginBottom: 16, textAlign: "center" }}>We sent a 6-digit code to your email. Enter it below.</div>
            <div style={{ marginBottom: 16 }}>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={e => e.key === "Enter" && code.length === 6 && handleVerify()} placeholder="000000" maxLength={6} autoFocus style={{ ...inputStyle, textAlign: "center", fontSize: 24, letterSpacing: "0.3em", fontWeight: 700 }} />
            </div>
            <button onClick={handleVerify} disabled={loading || code.length !== 6} style={{ background: s.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: (loading || code.length !== 6) ? 0.6 : 1 }}>
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button onClick={() => { setStep("login"); setCode(""); setError(""); }} style={{ background: "transparent", border: "none", color: s.muted, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 12 }}>Back to login</button>
          </>
        )}
      </div>
    </div>
  );
}
