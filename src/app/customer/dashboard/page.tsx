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

export default function CustomerDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();
  const accent = "#C8A45A";

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/appointments");
      if (res.status === 401) {
        router.push("/customer/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    }
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
    } catch (e) {
      console.error(e);
    }
    setCancellingId(null);
  };

  const handleLogout = async () => {
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

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e4dd" }}>
      <div style={{ background: "#141414", borderBottom: "1px solid #ffffff10", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: accent }}>MY BOOKINGS</div>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #ffffff15", borderRadius: 8, padding: "7px 16px", color: "#888", fontSize: 13, cursor: "pointer" }}>Logout</button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px" }}>
        {loading ? (
          <p style={{ color: "#666", textAlign: "center", paddingTop: 40 }}>Loading your appointments...</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{"\\uD83D\\uDCC5"}</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>No Appointments Yet</h2>
            <p style={{ color: "#666", fontSize: 14 }}>Book your first appointment to see it here.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Upcoming</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {upcoming.map((apt) => (
                    <div key={apt.id} style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 12, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: accent }}>{apt.shop?.name}</div>
                          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{apt.service?.name}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[apt.status], background: (STATUS_COLORS[apt.status]) + "18", padding: "3px 10px", borderRadius: 6 }}>{apt.status}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: "#888" }}>
                        <div>Date: <span style={{ color: "#e8e4dd" }}>{formatDate(apt.date)}</span></div>
                        <div>Time: <span style={{ color: "#e8e4dd" }}>{apt.startTime} - {apt.endTime}</span></div>
                        {apt.staff && <div>With: <span style={{ color: "#e8e4dd" }}>{apt.staff.name}</span></div>}
                        {apt.totalPrice > 0 && <div>Price: <span style={{ color: "#e8e4dd" }}>${apt.totalPrice}</span></div>}
                      </div>
                      {(apt.status === "CONFIRMED" || apt.status === "PENDING") && (
                        <button onClick={() => cancelAppointment(apt.id)} disabled={cancellingId === apt.id} style={{ marginTop: 12, background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "8px 18px", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{cancellingId === apt.id ? "Cancelling..." : "Cancel Appointment"}</button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14, color: "#666" }}>Past</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {past.map((apt) => (
                    <div key={apt.id} style={{ background: "#141414", border: "1px solid #ffffff08", borderRadius: 12, padding: 18, opacity: 0.6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{apt.service?.name} at {apt.shop?.name}</div>
                          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{formatDate(apt.date)} at {apt.startTime}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[apt.status], background: (STATUS_COLORS[apt.status]) + "18", padding: "3px 10px", borderRadius: 6 }}>{apt.status}</span>
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