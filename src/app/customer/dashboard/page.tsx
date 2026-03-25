"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#22c55e",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#6b7280",
  CANCELLED: "#ef4444",
  NO_SHOW: "#a855f7",
};

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

const dashCss = `
@keyframes cd-fade-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes cd-slide-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.cd-card{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.cd-card:hover{transform:translateY(-2px)}
.cd-btn{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.cd-btn:hover:not(:disabled){transform:translateY(-1px)}
.cd-btn:active:not(:disabled){transform:scale(0.97)}
.cd-header{animation:cd-slide-in 0.4s cubic-bezier(0.16,1,0.3,1) both}
.cd-content{animation:cd-fade-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both}
.cd-theme-btn{transition:all 0.25s ease}
.cd-theme-btn:hover{transform:scale(1.1)}
.cd-logout{transition:all 0.25s ease}
.cd-logout:hover{background:rgba(239,68,68,0.08) !important;border-color:rgba(239,68,68,0.3) !important;color:#ef4444 !important}
.cd-cancel{transition:all 0.25s ease}
.cd-cancel:hover{background:#ef444425 !important;border-color:#ef444460 !important}
`;

export default function CustomerDashboard() {
  const [dark, setDark] = useState<boolean | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();
  const accent = "#84934A";

  useEffect(() => {
    const saved = localStorage.getItem("customer-theme");
    setDark(saved === "dark");
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/customer/appointments");
      if (res.status === 401) { router.push("/customer/login"); return; }
      if (res.ok) { const data = await res.json(); setAppointments(data); }
      else { setError("Failed to load appointments. Please try again."); }
    } catch { setError("Connection error. Check your internet and try again."); }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  if (dark === null) return null;

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("customer-theme", next ? "dark" : "light");
  };

  const cancelAppointment = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch("/api/customer/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      });
      if (res.ok) fetchAppointments();
      else setError("Failed to cancel appointment. Please try again.");
    } catch { setError("Connection error. Please try again."); }
    setCancellingId(null);
  };

  const handleLogout = () => {
    document.cookie = "customer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/customer/login");
  };

  const upcoming = appointments.filter((a) => {
    const aptDate = new Date(a.date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return aptDate >= today && a.status !== "CANCELLED" && a.status !== "COMPLETED";
  });

  const past = appointments.filter((a) => {
    const aptDate = new Date(a.date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return aptDate < today || a.status === "CANCELLED" || a.status === "COMPLETED";
  });

  const t = dark
    ? { bg: "#0a0a0a", header: "#141414", headerBorder: "#ffffff10", card: "#141414", cardBorder: "#ffffff10", cardBorderFaint: "#ffffff08", text: "#e8e4dd", muted: "#666", subtext: "#888" }
    : { bg: "#ECECEC", header: "#fff", headerBorder: "#d4d4d4", card: "#fff", cardBorder: "#d4d4d4", cardBorderFaint: "#e5e5e5", text: "#1a1a1a", muted: "#888", subtext: "#555" };

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", background: t.bg, minHeight: "100vh", color: t.text }}>
      <style dangerouslySetInnerHTML={{__html: dashCss}} />
      <div className="cd-header" style={{ background: t.header, borderBottom: `1px solid ${t.headerBorder}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: dark ? "none" : "0 1px 8px rgba(0,0,0,0.05)", backdropFilter: "blur(12px)" }}>
        <img src={dark ? "/logo-dark.png" : "/logo.png"} alt="QueueUp" style={{ height: 100, width: "auto", display: "block" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={toggleTheme} className="cd-theme-btn" title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, lineHeight: 1, color: dark ? "#e8e4dd" : "#555", borderRadius: 8 }}>
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button onClick={handleLogout} className="cd-logout" style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "8px 18px", color: t.muted, fontSize: 13, cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>Logout</button>
        </div>
      </div>

      <div className="cd-content" style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: t.text, letterSpacing: "-0.02em" }}>My Bookings</h2>

        {error && (
          <div style={{ background: "#ef444412", border: "1px solid #ef444430", borderRadius: 12, padding: "14px 18px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "cd-fade-in 0.3s ease" }}>
            <span style={{ color: "#ef4444", fontSize: 14, fontWeight: 500 }}>{error}</span>
            <button onClick={() => { setError(null); fetchAppointments(); }} className="cd-btn" style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 12, fontFamily: "inherit" }}>Retry</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: t.muted, textAlign: "center", paddingTop: 40, fontSize: 14 }}>Loading your appointments...</p>
        ) : appointments.length === 0 && !error ? (
          <div style={{ textAlign: "center", paddingTop: 60, animation: "cd-fade-in 0.5s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: dark ? "#1a1a1a" : "#f0efed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.01em" }}>No Appointments Yet</h2>
            <p style={{ color: t.muted, fontSize: 14 }}>Book your first appointment to see it here.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: t.subtext, textTransform: "uppercase", letterSpacing: 1.5 }}>Upcoming</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
                  {upcoming.map((apt, i) => (
                    <div key={apt.id} className="cd-card" style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 14, padding: 20, boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.04)", animation: `cd-slide-in 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: accent }}>{apt.shop?.name}</div>
                          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4, color: t.text }}>{apt.service?.name}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[apt.status], background: STATUS_COLORS[apt.status] + "15", padding: "4px 12px", borderRadius: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>{apt.status}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: t.muted }}>
                        <div>Date: <span style={{ color: t.text, fontWeight: 500 }}>{formatDate(apt.date)}</span></div>
                        <div>Time: <span style={{ color: t.text, fontWeight: 500 }}>{apt.startTime} - {apt.endTime}</span></div>
                        {apt.staff && <div>With: <span style={{ color: t.text, fontWeight: 500 }}>{apt.staff.name}</span></div>}
                        {apt.totalPrice > 0 && <div>Price: <span style={{ color: t.text, fontWeight: 500 }}>${apt.totalPrice}</span></div>}
                      </div>
                      {(apt.status === "CONFIRMED" || apt.status === "PENDING") && (
                        <button onClick={() => cancelAppointment(apt.id)} disabled={cancellingId === apt.id} className="cd-cancel" style={{ marginTop: 14, background: "#ef444415", border: "1px solid #ef444435", borderRadius: 10, padding: "9px 20px", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {cancellingId === apt.id ? "Cancelling..." : "Cancel Appointment"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: t.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>Past</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {past.map((apt, i) => (
                    <div key={apt.id} style={{ background: t.card, border: `1px solid ${t.cardBorderFaint}`, borderRadius: 14, padding: 20, opacity: 0.55, animation: `cd-slide-in 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: t.text }}>{apt.service?.name} at {apt.shop?.name}</div>
                          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{formatDate(apt.date)} at {apt.startTime}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[apt.status], background: STATUS_COLORS[apt.status] + "15", padding: "4px 12px", borderRadius: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>{apt.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
