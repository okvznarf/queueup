"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

export default function CustomerDashboard() {
  const [dark, setDark] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();
  const accent = "#84934A";

  useEffect(() => {
    const saved = localStorage.getItem("customer-theme");
    if (saved === "dark") setDark(true);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("customer-theme", next ? "dark" : "light");
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/appointments");
      if (res.status === 401) { router.push("/customer/login"); return; }
      if (res.ok) { const data = await res.json(); setAppointments(data); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const cancelAppointment = async (id: string) => {
    setCancellingId(id);
    try {
      const res = await fetch("/api/customer/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      });
      if (res.ok) fetchAppointments();
    } catch (e) { console.error(e); }
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
    <div style={{ fontFamily: "system-ui, sans-serif", background: t.bg, minHeight: "100vh", color: t.text }}>
      <div style={{ background: t.header, borderBottom: `1px solid ${t.headerBorder}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "inline-block", background: "#fff", borderRadius: 6, padding: "4px 8px" }}><Image src="/logo.png" alt="QueueUp" width={110} height={36} style={{ objectFit: "contain", display: "block" }} /></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, color: dark ? "#e8e4dd" : "#555" }}>
            {dark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: "7px 16px", color: t.muted, fontSize: 13, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: t.text }}>My Bookings</h2>

        {loading ? (
          <p style={{ color: t.muted, textAlign: "center", paddingTop: 40 }}>Loading your appointments...</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: t.muted }}>—</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>No Appointments Yet</h2>
            <p style={{ color: t.muted, fontSize: 14 }}>Book your first appointment to see it here.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>Upcoming</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {upcoming.map((apt) => (
                    <div key={apt.id} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 18, boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: accent }}>{apt.shop?.name}</div>
                          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4, color: t.text }}>{apt.service?.name}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[apt.status], background: STATUS_COLORS[apt.status] + "18", padding: "3px 10px", borderRadius: 6 }}>{apt.status}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: t.muted }}>
                        <div>Date: <span style={{ color: t.text }}>{formatDate(apt.date)}</span></div>
                        <div>Time: <span style={{ color: t.text }}>{apt.startTime} - {apt.endTime}</span></div>
                        {apt.staff && <div>With: <span style={{ color: t.text }}>{apt.staff.name}</span></div>}
                        {apt.totalPrice > 0 && <div>Price: <span style={{ color: t.text }}>${apt.totalPrice}</span></div>}
                      </div>
                      {(apt.status === "CONFIRMED" || apt.status === "PENDING") && (
                        <button onClick={() => cancelAppointment(apt.id)} disabled={cancellingId === apt.id} style={{ marginTop: 12, background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "8px 18px", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: t.muted, textTransform: "uppercase", letterSpacing: 1 }}>Past</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {past.map((apt) => (
                    <div key={apt.id} style={{ background: t.card, border: `1px solid ${t.cardBorderFaint}`, borderRadius: 12, padding: 18, opacity: 0.6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, color: t.text }}>{apt.service?.name} at {apt.shop?.name}</div>
                          <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{formatDate(apt.date)} at {apt.startTime}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[apt.status], background: STATUS_COLORS[apt.status] + "18", padding: "3px 10px", borderRadius: 6 }}>{apt.status}</span>
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
