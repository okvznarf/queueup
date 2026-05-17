"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";

function SuccessInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) ?? "";
  const sessionId = searchParams.get("session_id");

  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const redirect = setTimeout(() => {
      router.push(`/admin/${slug}/appointments?billing=success`);
    }, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(redirect);
    };
  }, [router, slug]);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#0a0a0a",
        color: "#e8e4dd",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 16, padding: 40, maxWidth: 460, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Subscription active</h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Thanks — your payment method is on file. The AI receptionist will keep running without
          interruption when your trial ends. You&apos;ll get an email with the receipt shortly.
        </p>
        {sessionId && (
          <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace", marginBottom: 20, wordBreak: "break-all" }}>
            Stripe session: {sessionId}
          </div>
        )}
        <button
          onClick={() => router.push(`/admin/${slug}/appointments`)}
          style={{
            background: "#C8A45A",
            color: "#111",
            border: "none",
            borderRadius: 10,
            padding: "12px 32px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Go to dashboard
        </button>
        <div style={{ fontSize: 11, color: "#555", marginTop: 16 }}>
          Auto-redirecting in {secondsLeft}s...
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
