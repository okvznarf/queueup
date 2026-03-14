"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin/sharp-and-co/appointments";

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { name, email, password } : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        const destination = data.shopSlug
          ? `/admin/${data.shopSlug}/appointments`
          : redirect;
        router.push(destination);
      }
    } catch (e) {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const accent = "#C8A45A";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e4dd" }}>
      <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 16, padding: 36, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 2, color: accent }}>QUEUEUP</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 4px" }}>{isRegister ? "Create Account" : "Admin Login"}</h1>
          <p style={{ color: "#666", fontSize: 14 }}>{isRegister ? "Sign up to manage your business" : "Sign in to your dashboard"}</p>
        </div>

        {error && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>
        )}

        {isRegister && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as any, outline: "none" }} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as any, outline: "none" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: "#888", display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#e8e4dd", width: "100%", boxSizing: "border-box" as any, outline: "none" }} />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ background: accent, color: "#111", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", opacity: loading ? 0.6 : 1 }}>{loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}</button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#666" }}>
          {isRegister ? "Already have an account? " : "Need an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError(""); }} style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{isRegister ? "Sign In" : "Register"}</button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
