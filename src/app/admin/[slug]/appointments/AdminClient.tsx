"use client";
import { useState, useEffect, useCallback } from "react";

type Shop = any;
type Appointment = any;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#22c55e",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#6b7280",
  CANCELLED: "#ef4444",
  NO_SHOW: "#a855f7",
};

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu",
  FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const INPUT = {
  background: "#1a1a1a", border: "1px solid #ffffff20", borderRadius: 8,
  padding: "9px 12px", color: "#e8e4dd", fontSize: 14, outline: "none", width: "100%",
};
const LABEL = { display: "block" as const, fontSize: 13, color: "#888", marginBottom: 5 };

export default function AdminClient({ shop }: { shop: Shop }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("appointments");
  const accent = shop.primaryColor || "#C8A45A";

  // Services state
  const [services, setServices] = useState<any[]>(shop.services || []);
  const [serviceModal, setServiceModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });

  // Staff state
  const [staff, setStaff] = useState<any[]>(shop.staff || []);
  const [staffModal, setStaffModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });

  // Working hours state
  const [workingHours, setWorkingHours] = useState<any[]>(shop.workingHours || []);

  // Shop settings state
  const [shopInfo, setShopInfo] = useState({
    name: shop.name || "",
    email: shop.email || "",
    phone: shop.phone || "",
    address: shop.address || "",
    city: shop.city || "",
    state: shop.state || "",
    zipCode: shop.zipCode || "",
    primaryColor: shop.primaryColor || "#C8A45A",
    darkMode: shop.darkMode || false,
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Appointments ──────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments?shopId=" + shop.id + "&date=" + selectedDate);
      if (res.ok) setAppointments(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [shop.id, selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/appointments/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchAppointments();
    } catch (e) { console.error(e); }
  };

  // ── Services ──────────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    const res = await fetch("/api/admin/services?shopId=" + shop.id);
    if (res.ok) setServices(await res.json());
  }, [shop.id]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const saveService = async (data: any) => {
    setSaving(true);
    try {
      if (data.id) {
        const res = await fetch("/api/admin/services", {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        if (res.ok) { showToast("Service updated"); fetchServices(); setServiceModal({ open: false, item: null }); }
        else showToast("Failed to update service", "error");
      } else {
        const res = await fetch("/api/admin/services", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, shopId: shop.id }),
        });
        if (res.ok) { showToast("Service added"); fetchServices(); setServiceModal({ open: false, item: null }); }
        else showToast("Failed to add service", "error");
      }
    } catch { showToast("Error saving service", "error"); }
    setSaving(false);
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    const res = await fetch("/api/admin/services", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    if (res.ok) { showToast("Service deleted"); fetchServices(); }
    else showToast("Failed to delete", "error");
  };

  // ── Staff ─────────────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/admin/staff?shopId=" + shop.id);
    if (res.ok) setStaff(await res.json());
  }, [shop.id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const saveStaff = async (data: any) => {
    setSaving(true);
    try {
      if (data.id) {
        const res = await fetch("/api/admin/staff", {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        if (res.ok) { showToast("Staff updated"); fetchStaff(); setStaffModal({ open: false, item: null }); }
        else showToast("Failed to update staff", "error");
      } else {
        const res = await fetch("/api/admin/staff", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, shopId: shop.id }),
        });
        if (res.ok) { showToast("Staff added"); fetchStaff(); setStaffModal({ open: false, item: null }); }
        else showToast("Failed to add staff", "error");
      }
    } catch { showToast("Error saving staff", "error"); }
    setSaving(false);
  };

  const deleteStaff = async (id: string) => {
    if (!confirm("Delete this staff member? This cannot be undone.")) return;
    const res = await fetch("/api/admin/staff", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    if (res.ok) { showToast("Staff deleted"); fetchStaff(); }
    else showToast("Failed to delete", "error");
  };

  // ── Working Hours ─────────────────────────────────────────────────────────
  const saveHours = async (day: string, openTime: string, closeTime: string, isClosed: boolean) => {
    const res = await fetch("/api/admin/hours", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, day, openTime, closeTime, isClosed }),
    });
    if (res.ok) {
      const updated = await res.json();
      showToast(DAY_LABELS[day] + " hours saved");
      setWorkingHours((prev) => {
        const idx = prev.findIndex((h: any) => h.day === day);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [...prev, updated];
      });
    } else showToast("Failed to save hours", "error");
  };

  // ── Shop Settings ─────────────────────────────────────────────────────────
  const saveShopInfo = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/shop", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: shop.id, ...shopInfo }),
    });
    if (res.ok) showToast("Settings saved");
    else showToast("Failed to save settings", "error");
    setSaving(false);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a: any) => a.status === "CONFIRMED").length,
    completed: appointments.filter((a: any) => a.status === "COMPLETED").length,
    revenue: appointments.filter((a: any) => a.status !== "CANCELLED").reduce((sum: number, a: any) => sum + (a.totalPrice || 0), 0),
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "#e8e4dd" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "error" ? "#ef444420" : "#22c55e20",
          border: "1px solid " + (toast.type === "error" ? "#ef4444" : "#22c55e") + "60",
          color: toast.type === "error" ? "#ef4444" : "#22c55e",
          padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 500,
        }}>{toast.msg}</div>
      )}

      {/* Top Bar */}
      <div style={{ background: "#141414", borderBottom: "1px solid #ffffff10", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 2, color: accent, textTransform: "uppercase" }}>{shopInfo.name || shop.name}</div>
          <span style={{ fontSize: 12, color: "#666", background: "#1a1a1a", padding: "3px 10px", borderRadius: 6 }}>Admin</span>
        </div>
        <a href={"/booking/" + shop.slug} target="_blank" style={{ fontSize: 13, color: accent, textDecoration: "none" }}>View Booking Page ↗</a>
      </div>

      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: "#111", borderRight: "1px solid #ffffff10", minHeight: "calc(100vh - 50px)", padding: "20px 0" }}>
          {[
            { id: "appointments", label: "Appointments" },
            { id: "staff", label: shop.staffLabel + "s" },
            { id: "services", label: shop.serviceLabel + "s" },
            { id: "hours", label: "Hours" },
            { id: "settings", label: "Settings" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "block", width: "100%", padding: "10px 20px", border: "none",
              background: activeTab === tab.id ? accent + "18" : "transparent",
              color: activeTab === tab.id ? accent : "#888",
              borderLeft: activeTab === tab.id ? "3px solid " + accent : "3px solid transparent",
              fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: 24 }}>

          {/* ── APPOINTMENTS ── */}
          {activeTab === "appointments" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                <StatCard label="Total Today" value={stats.total} color="#3b82f6" />
                <StatCard label="Confirmed" value={stats.confirmed} color="#22c55e" />
                <StatCard label="Completed" value={stats.completed} color="#6b7280" />
                <StatCard label="Revenue" value={"$" + stats.revenue} color={accent} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Appointments</h2>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ background: "#1a1a1a", border: "1px solid #ffffff15", borderRadius: 8, padding: "8px 12px", color: "#e8e4dd", fontSize: 14, outline: "none" }} />
                {selectedDate !== todayStr && (
                  <button onClick={() => setSelectedDate(todayStr)} style={{ background: accent + "20", color: accent, border: "1px solid " + accent + "40", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>Today</button>
                )}
              </div>
              {loading ? (
                <p style={{ color: "#666" }}>Loading...</p>
              ) : appointments.length === 0 ? (
                <div style={{ background: "#141414", borderRadius: 12, padding: 40, textAlign: "center", border: "1px solid #ffffff10" }}>
                  <p style={{ fontSize: 16, color: "#666" }}>No appointments for this date</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {appointments.map((apt: any) => (
                    <div key={apt.id} style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 12, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ minWidth: 70, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{apt.startTime}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>{apt.endTime}</div>
                      </div>
                      <div style={{ width: 1, height: 50, background: "#ffffff10" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{apt.customer?.name}</div>
                        <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                          {apt.service?.name}{apt.staff ? " with " + apt.staff.name : ""}{apt.totalPrice ? " — $" + apt.totalPrice : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{apt.customer?.phone}{apt.customer?.email ? " | " + apt.customer.email : ""}</div>
                        {apt.notes && <div style={{ fontSize: 12, color: "#555", marginTop: 4, fontStyle: "italic" }}>Note: {apt.notes}</div>}
                        {apt.vehicleInfo && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Vehicle: {apt.vehicleInfo}</div>}
                        {apt.partySize && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Party: {apt.partySize} guests</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[apt.status] || "#888", background: (STATUS_COLORS[apt.status] || "#888") + "18", padding: "3px 10px", borderRadius: 6 }}>{apt.status}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {apt.status === "CONFIRMED" && <ActionBtn label="Start" color="#3b82f6" onClick={() => updateStatus(apt.id, "IN_PROGRESS")} />}
                          {(apt.status === "CONFIRMED" || apt.status === "IN_PROGRESS") && <ActionBtn label="Complete" color="#22c55e" onClick={() => updateStatus(apt.id, "COMPLETED")} />}
                          {apt.status !== "CANCELLED" && apt.status !== "COMPLETED" && <ActionBtn label="Cancel" color="#ef4444" onClick={() => updateStatus(apt.id, "CANCELLED")} />}
                          {apt.status === "CONFIRMED" && <ActionBtn label="No Show" color="#a855f7" onClick={() => updateStatus(apt.id, "NO_SHOW")} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STAFF ── */}
          {activeTab === "staff" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{shop.staffLabel}s</h2>
                <button onClick={() => setStaffModal({ open: true, item: null })} style={{ background: accent, color: "#111", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Add {shop.staffLabel}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {staff.map((st: any) => (
                  <div key={st.id} style={{ background: "#141414", border: "1px solid " + (st.isActive ? "#ffffff10" : "#ffffff06"), borderRadius: 12, padding: 20, opacity: st.isActive ? 1 : 0.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#111" }}>
                        {st.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      {!st.isActive && <span style={{ fontSize: 10, color: "#666", background: "#ffffff0a", padding: "2px 8px", borderRadius: 4 }}>INACTIVE</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{st.name}</div>
                    {st.role && <div style={{ fontSize: 13, color: accent, marginTop: 2 }}>{st.role}</div>}
                    {st.email && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{st.email}</div>}
                    {st.phone && <div style={{ fontSize: 12, color: "#666" }}>{st.phone}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button onClick={() => setStaffModal({ open: true, item: st })} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid #ffffff15", background: "transparent", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => deleteStaff(st.id)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #ef444430", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SERVICES ── */}
          {activeTab === "services" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{shop.serviceLabel}s</h2>
                <button onClick={() => setServiceModal({ open: true, item: null })} style={{ background: accent, color: "#111", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Add {shop.serviceLabel}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {services.map((sv: any) => (
                  <div key={sv.id} style={{ background: "#141414", border: "1px solid " + (sv.isActive ? "#ffffff10" : "#ffffff06"), borderRadius: 12, padding: 18, opacity: sv.isActive ? 1 : 0.5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{sv.name}</div>
                      {!sv.isActive && <span style={{ fontSize: 10, color: "#666", background: "#ffffff0a", padding: "2px 8px", borderRadius: 4, flexShrink: 0, marginLeft: 8 }}>INACTIVE</span>}
                    </div>
                    {sv.description && <div style={{ fontSize: 12, color: "#666", marginTop: 4, lineHeight: 1.4 }}>{sv.description}</div>}
                    <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>{sv.duration} min</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: accent, marginTop: 4 }}>{sv.price > 0 ? "$" + sv.price : "Free"}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button onClick={() => setServiceModal({ open: true, item: sv })} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid #ffffff15", background: "transparent", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => deleteService(sv.id)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #ef444430", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HOURS ── */}
          {activeTab === "hours" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Working Hours</h2>
              <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 12, overflow: "hidden", maxWidth: 640 }}>
                {DAYS.map((day, i) => {
                  const h = workingHours.find((wh: any) => wh.day === day);
                  return <HoursRow key={day} day={day} label={DAY_LABELS[day]} hours={h} accent={accent} onSave={saveHours} isLast={i === DAYS.length - 1} />;
                })}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <div style={{ maxWidth: 520 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Shop Settings</h2>
              <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={LABEL}>Business Name</label>
                  <input style={INPUT} value={shopInfo.name} onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={LABEL}>Email</label>
                    <input type="email" style={INPUT} value={shopInfo.email} onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })} />
                  </div>
                  <div>
                    <label style={LABEL}>Phone</label>
                    <input style={INPUT} value={shopInfo.phone} onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Address</label>
                  <input style={INPUT} value={shopInfo.address} onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={LABEL}>City</label>
                    <input style={INPUT} value={shopInfo.city} onChange={(e) => setShopInfo({ ...shopInfo, city: e.target.value })} />
                  </div>
                  <div>
                    <label style={LABEL}>State</label>
                    <input style={INPUT} value={shopInfo.state} onChange={(e) => setShopInfo({ ...shopInfo, state: e.target.value })} />
                  </div>
                  <div>
                    <label style={LABEL}>ZIP</label>
                    <input style={INPUT} value={shopInfo.zipCode} onChange={(e) => setShopInfo({ ...shopInfo, zipCode: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "end" }}>
                  <div>
                    <label style={LABEL}>Accent Color</label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input type="color" value={shopInfo.primaryColor} onChange={(e) => setShopInfo({ ...shopInfo, primaryColor: e.target.value })} style={{ width: 44, height: 38, borderRadius: 8, border: "1px solid #ffffff20", background: "transparent", cursor: "pointer", padding: 2 }} />
                      <input style={{ ...INPUT, flex: 1 }} value={shopInfo.primaryColor} onChange={(e) => setShopInfo({ ...shopInfo, primaryColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label style={LABEL}>Dark Mode</label>
                    <button onClick={() => setShopInfo({ ...shopInfo, darkMode: !shopInfo.darkMode })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ffffff20", background: shopInfo.darkMode ? "#ffffff15" : "transparent", color: shopInfo.darkMode ? "#e8e4dd" : "#666", fontSize: 14, cursor: "pointer" }}>
                      {shopInfo.darkMode ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>
                <div style={{ paddingTop: 4 }}>
                  <button onClick={saveShopInfo} disabled={saving} style={{ background: accent, color: "#111", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 20, background: "#141414", border: "1px solid #ffffff10", borderRadius: 12, padding: "14px 20px" }}>
                <div style={{ fontSize: 13, color: "#666" }}>Booking URL</div>
                <div style={{ fontSize: 14, color: "#e8e4dd", marginTop: 4, fontFamily: "monospace" }}>/booking/{shop.slug}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Service Modal ── */}
      {serviceModal.open && (
        <ServiceModal
          item={serviceModal.item}
          label={shop.serviceLabel}
          accent={accent}
          saving={saving}
          onSave={saveService}
          onClose={() => setServiceModal({ open: false, item: null })}
        />
      )}

      {/* ── Staff Modal ── */}
      {staffModal.open && (
        <StaffModal
          item={staffModal.item}
          label={shop.staffLabel}
          accent={accent}
          saving={saving}
          onSave={saveStaff}
          onClose={() => setStaffModal({ open: false, item: null })}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "#141414", border: "1px solid #ffffff10", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid " + color + "40", background: color + "18", color, cursor: "pointer" }}>{label}</button>
  );
}

function HoursRow({ day, label, hours, accent, onSave, isLast }: { day: string; label: string; hours: any; accent: string; onSave: (day: string, open: string, close: string, closed: boolean) => void; isLast: boolean }) {
  const [openTime, setOpenTime] = useState(hours?.openTime || "09:00");
  const [closeTime, setCloseTime] = useState(hours?.closeTime || "18:00");
  const [isClosed, setIsClosed] = useState(hours?.isClosed ?? false);
  const [dirty, setDirty] = useState(false);

  const mark = (fn: () => void) => { fn(); setDirty(true); };

  const timeInput = {
    background: "#1e1e1e", border: "1px solid #ffffff15", borderRadius: 6,
    padding: "6px 10px", color: "#e8e4dd", fontSize: 13, outline: "none", width: 88,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid #ffffff08" }}>
      <div style={{ width: 38, fontWeight: 600, fontSize: 14, color: isClosed ? "#444" : "#e8e4dd" }}>{label}</div>
      <button onClick={() => mark(() => setIsClosed(!isClosed))} style={{
        padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
        background: isClosed ? "#ef444420" : "#22c55e20",
        color: isClosed ? "#ef4444" : "#22c55e",
      }}>{isClosed ? "Closed" : "Open"}</button>
      <input type="time" value={openTime} disabled={isClosed} onChange={(e) => mark(() => setOpenTime(e.target.value))} style={{ ...timeInput, opacity: isClosed ? 0.3 : 1 }} />
      <span style={{ color: "#444", fontSize: 13 }}>—</span>
      <input type="time" value={closeTime} disabled={isClosed} onChange={(e) => mark(() => setCloseTime(e.target.value))} style={{ ...timeInput, opacity: isClosed ? 0.3 : 1 }} />
      <button
        onClick={() => { onSave(day, openTime, closeTime, isClosed); setDirty(false); }}
        style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: dirty ? accent : "#ffffff0a", color: dirty ? "#111" : "#555" }}
      >Save</button>
    </div>
  );
}

function ServiceModal({ item, label, accent, saving, onSave, onClose }: { item: any; label: string; accent: string; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    id: item?.id || "",
    name: item?.name || "",
    description: item?.description || "",
    duration: item?.duration || 30,
    price: item?.price ?? 0,
    isActive: item?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={item ? "Edit " + label : "Add " + label} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={LABEL}>Name *</label>
          <input style={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={label + " name"} autoFocus />
        </div>
        <div>
          <label style={LABEL}>Description</label>
          <textarea style={{ ...INPUT, resize: "vertical", minHeight: 72 } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={LABEL}>Duration (minutes) *</label>
            <input type="number" style={INPUT} value={form.duration} min={5} max={480} onChange={(e) => set("duration", parseInt(e.target.value) || 30)} />
          </div>
          <div>
            <label style={LABEL}>Price ($)</label>
            <input type="number" style={INPUT} value={form.price} min={0} step={0.01} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        {item && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => set("isActive", !form.isActive)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #ffffff20", background: form.isActive ? "#22c55e20" : "#ffffff0a", color: form.isActive ? "#22c55e" : "#666", fontSize: 13, cursor: "pointer" }}>
              {form.isActive ? "Active" : "Inactive"}
            </button>
            <span style={{ fontSize: 12, color: "#555" }}>Toggle to show/hide from booking page</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ flex: 1, background: accent, color: "#111", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: saving || !form.name ? "not-allowed" : "pointer", opacity: saving || !form.name ? 0.6 : 1 }}>
            {saving ? "Saving..." : item ? "Save Changes" : "Add " + label}
          </button>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #ffffff15", background: "transparent", color: "#888", fontSize: 14, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function StaffModal({ item, label, accent, saving, onSave, onClose }: { item: any; label: string; accent: string; saving: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    id: item?.id || "",
    name: item?.name || "",
    role: item?.role || "",
    email: item?.email || "",
    phone: item?.phone || "",
    bio: item?.bio || "",
    isActive: item?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={item ? "Edit " + label : "Add " + label} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={LABEL}>Name *</label>
          <input style={INPUT} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" autoFocus />
        </div>
        <div>
          <label style={LABEL}>Role / Title</label>
          <input style={INPUT} value={form.role} onChange={(e) => set("role", e.target.value)} placeholder={"e.g. Senior " + label} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={LABEL}>Email</label>
            <input type="email" style={INPUT} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Phone</label>
            <input style={INPUT} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>
        <div>
          <label style={LABEL}>Bio</label>
          <textarea style={{ ...INPUT, resize: "vertical", minHeight: 72 } as any} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Short bio shown on booking page" />
        </div>
        {item && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => set("isActive", !form.isActive)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #ffffff20", background: form.isActive ? "#22c55e20" : "#ffffff0a", color: form.isActive ? "#22c55e" : "#666", fontSize: 13, cursor: "pointer" }}>
              {form.isActive ? "Active" : "Inactive"}
            </button>
            <span style={{ fontSize: 12, color: "#555" }}>Toggle to show/hide from booking page</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ flex: 1, background: accent, color: "#111", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: saving || !form.name ? "not-allowed" : "pointer", opacity: saving || !form.name ? 0.6 : 1 }}>
            {saving ? "Saving..." : item ? "Save Changes" : "Add " + label}
          </button>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #ffffff15", background: "transparent", color: "#888", fontSize: 14, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#161616", border: "1px solid #ffffff15", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
