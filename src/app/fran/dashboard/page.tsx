"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Shop = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  businessType: string;
  subscriptionActive: boolean;
  trialEndsAt: string | null;
  employeeCount: number;
  paidUntil: string | null;
  monthlyPrice: number;
  createdAt: string;
  _count: { appointments: number; customers: number; staff: number };
};

type StaffMember = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatus(shop: Shop): { label: string; color: string } {
  const now = new Date();
  if (!shop.subscriptionActive) return { label: "DISABLED", color: "#ef4444" };
  const inTrial = shop.trialEndsAt && new Date(shop.trialEndsAt) > now;
  const hasPaid = shop.paidUntil && new Date(shop.paidUntil) > now;
  if (inTrial) {
    const days = Math.ceil((new Date(shop.trialEndsAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { label: `TRIAL (${days}d left)`, color: "#f59e0b" };
  }
  if (hasPaid) return { label: "ACTIVE", color: "#22c55e" };
  return { label: "EXPIRED", color: "#ef4444" };
}

export default function SuperadminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [empCount, setEmpCount] = useState(1);
  const [paidMonths, setPaidMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newShop, setNewShop] = useState({ name: "", email: "", password: "", businessType: "BARBER", phone: "", employeeCount: 1 });
  const [createError, setCreateError] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [newStaff, setNewStaff] = useState({ name: "", role: "", email: "", phone: "", bio: "" });
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchShops = async () => {
    const res = await fetch("/api/superadmin/shops");
    if (res.status === 401) { router.push("/fran/login"); return; }
    const data = await res.json();
    setShops(data);
    setLoading(false);
  };

  useEffect(() => { fetchShops(); }, []);

  const handleToggleActive = async (shop: Shop) => {
    await fetch("/api/superadmin/shops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, subscriptionActive: !shop.subscriptionActive }),
    });
    fetchShops();
  };

  const fetchStaff = async (shopId: string) => {
    setStaffLoading(true);
    const res = await fetch(`/api/superadmin/staff?shopId=${shopId}`);
    if (res.ok) setStaffList(await res.json());
    setStaffLoading(false);
  };

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 500_000) { reject(new Error("Image too large (max 500KB)")); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddStaff = async () => {
    if (!editShop || !newStaff.name) return;
    setStaffSaving(true);
    const res = await fetch("/api/superadmin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: editShop.id, ...newStaff, avatarUrl: avatarPreview }),
    });
    setStaffSaving(false);
    if (res.ok) {
      setShowAddStaff(false);
      setNewStaff({ name: "", role: "", email: "", phone: "", bio: "" });
      setAvatarPreview(null);
      fetchStaff(editShop.id);
    }
  };

  const handleUpdateStaffAvatar = async (staffId: string, file: File) => {
    try {
      const base64 = await handleFileToBase64(file);
      await fetch("/api/superadmin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: staffId, avatarUrl: base64 }),
      });
      if (editShop) fetchStaff(editShop.id);
    } catch {}
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Delete this staff member?")) return;
    await fetch("/api/superadmin/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staffId }),
    });
    if (editShop) fetchStaff(editShop.id);
  };

  const handleToggleStaffActive = async (staff: StaffMember) => {
    await fetch("/api/superadmin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staff.id, isActive: !staff.isActive }),
    });
    if (editShop) fetchStaff(editShop.id);
  };

  const handleSave = async () => {
    if (!editShop) return;
    setSaving(true);
    const paidUntil = new Date();
    paidUntil.setMonth(paidUntil.getMonth() + paidMonths);

    await fetch("/api/superadmin/shops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: editShop.id, employeeCount: empCount, paidUntil: paidUntil.toISOString() }),
    });
    setSaving(false);
    setEditShop(null);
    fetchShops();
  };

  const s = {
    bg: "#0a0a0a", card: "#141414", border: "#ffffff10", text: "#e8e4dd",
    muted: "#888", accent: "#84934A",
  };

  if (loading) return <div style={{ background: s.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: s.text, fontFamily: "system-ui" }}>Loading...</div>;

  const totalRevenue = shops.reduce((sum, sh) => {
    const now = new Date();
    const active = sh.subscriptionActive && ((sh.paidUntil && new Date(sh.paidUntil) > now) || (sh.trialEndsAt && new Date(sh.trialEndsAt) > now));
    return sum + (active ? sh.monthlyPrice : 0);
  }, 0);

  return (
    <div style={{ fontFamily: "system-ui", background: s.bg, minHeight: "100vh", color: s.text, padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>QueueUp Admin</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowCreate(true); setCreateError(""); setNewShop({ name: "", email: "", password: "", businessType: "BARBER", phone: "", employeeCount: 1 }); }} style={{ background: s.accent, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "system-ui" }}>+ Add Shop</button>
            <button onClick={() => { document.cookie = "auth_token=; path=/; max-age=0"; router.push("/fran/login"); }} style={{ background: "transparent", border: "1px solid #ffffff20", color: s.muted, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>Logout</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Shops", value: shops.length },
            { label: "Active", value: shops.filter(sh => getStatus(sh).label.includes("ACTIVE") || getStatus(sh).label.includes("TRIAL")).length },
            { label: "Monthly Revenue", value: `${totalRevenue.toFixed(0)}` },
            { label: "Total Customers", value: shops.reduce((s, sh) => s + sh._count.customers, 0) },
          ].map((stat, i) => (
            <div key={i} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: "20px" }}>
              <div style={{ fontSize: 12, color: s.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Shops table */}
        <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${s.border}`, textAlign: "left" }}>
                {["Business", "Type", "Employees", "Price/mo", "Status", "Paid Until", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontSize: 12, color: s.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shops.map(shop => {
                const status = getStatus(shop);
                return (
                  <tr key={shop.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{shop.name}</div>
                      <div style={{ fontSize: 12, color: s.muted }}>{shop.email || shop.slug}</div>
                    </td>
                    <td style={{ padding: "14px 16px", color: s.muted }}>{shop.businessType}</td>
                    <td style={{ padding: "14px 16px" }}>{shop.employeeCount}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>{shop.monthlyPrice.toFixed(0)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: status.color + "20", color: status.color, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{status.label}</span>
                    </td>
                    <td style={{ padding: "14px 16px", color: s.muted }}>{formatDate(shop.paidUntil)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setEditShop(shop); setEmpCount(shop.employeeCount); setPaidMonths(1); setShowStaff(false); fetchStaff(shop.id); }} style={{ background: s.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Manage</button>
                        <button onClick={() => handleToggleActive(shop)} style={{ background: "transparent", border: `1px solid ${shop.subscriptionActive ? "#ef444440" : "#22c55e40"}`, color: shop.subscriptionActive ? "#ef4444" : "#22c55e", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {shop.subscriptionActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Create shop modal */}
        {showCreate && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setShowCreate(false)}>
            <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 16, padding: 32, width: 440 }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Add New Shop</h2>
              {createError && <div style={{ background: "#ef444420", color: "#ef4444", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{createError}</div>}

              {[
                { label: "Business Name", key: "name", type: "text" },
                { label: "Admin Email", key: "email", type: "email" },
                { label: "Admin Password", key: "password", type: "password" },
                { label: "Phone", key: "phone", type: "tel" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} value={(newShop as any)[f.key]} onChange={e => setNewShop({ ...newShop, [f.key]: e.target.value })} style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Business Type</label>
                <select value={newShop.businessType} onChange={e => setNewShop({ ...newShop, businessType: e.target.value })} style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }}>
                  {["BARBER", "RESTAURANT", "MECHANIC", "SALON", "DENTIST", "SPA", "FITNESS", "VETERINARY", "OTHER"].map(t => (
                    <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Employees</label>
                <input type="number" min={1} value={newShop.employeeCount} onChange={e => setNewShop({ ...newShop, employeeCount: parseInt(e.target.value) || 1 })} style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                <div style={{ fontSize: 13, color: s.muted, marginTop: 6 }}>Price: <strong style={{ color: s.accent }}>{25 + newShop.employeeCount * 5}/mo</strong> | 30-day free trial</div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setShowCreate(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer", fontFamily: "system-ui" }}>Cancel</button>
                <button onClick={async () => {
                  setSaving(true); setCreateError("");
                  const res = await fetch("/api/superadmin/shops", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newShop),
                  });
                  const data = await res.json();
                  setSaving(false);
                  if (!res.ok) { setCreateError(data.error); return; }
                  setShowCreate(false);
                  fetchShops();
                }} disabled={saving} style={{ flex: 1, background: s.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1, fontFamily: "system-ui" }}>{saving ? "Creating..." : "Create Shop"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editShop && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }} onClick={() => setEditShop(null)}>
            <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 16, padding: 32, width: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Manage: {editShop.name}</h2>
                <button onClick={() => setEditShop(null)} style={{ background: "transparent", border: "none", color: s.muted, fontSize: 20, cursor: "pointer" }}>x</button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${s.border}` }}>
                <button onClick={() => setShowStaff(false)} style={{ background: "transparent", border: "none", borderBottom: !showStaff ? `2px solid ${s.accent}` : "2px solid transparent", color: !showStaff ? s.text : s.muted, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Subscription</button>
                <button onClick={() => setShowStaff(true)} style={{ background: "transparent", border: "none", borderBottom: showStaff ? `2px solid ${s.accent}` : "2px solid transparent", color: showStaff ? s.text : s.muted, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Staff ({staffList.length})</button>
              </div>

              {/* Subscription tab */}
              {!showStaff && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Number of Employees</label>
                    <input type="number" min={0} value={empCount} onChange={e => setEmpCount(parseInt(e.target.value) || 0)} style={{ background: "#1a1a1a", border: "1.5px solid #ffffff15", borderRadius: 10, padding: "11px 14px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                    <div style={{ fontSize: 13, color: s.muted, marginTop: 6 }}>Price: 25 + ({empCount} x 5) = <strong style={{ color: s.accent }}>{25 + empCount * 5}/mo</strong></div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Extend Subscription (months)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 3, 6, 12].map(m => (
                        <button key={m} onClick={() => setPaidMonths(m)} style={{ flex: 1, background: paidMonths === m ? s.accent : "#1a1a1a", color: paidMonths === m ? "#fff" : s.muted, border: `1px solid ${paidMonths === m ? s.accent : "#ffffff15"}`, borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{m}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: s.muted, marginTop: 6 }}>Total: <strong style={{ color: s.accent }}>{((25 + empCount * 5) * paidMonths).toFixed(0)}</strong></div>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setEditShop(null)} style={{ flex: 1, background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer", fontFamily: "system-ui" }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: s.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1, fontFamily: "system-ui" }}>{saving ? "Saving..." : "Save & Extend"}</button>
                  </div>
                </>
              )}

              {/* Staff tab */}
              {showStaff && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: s.muted }}>{staffList.length} staff members</div>
                    <button onClick={() => { setShowAddStaff(true); setNewStaff({ name: "", role: "", email: "", phone: "", bio: "" }); setAvatarPreview(null); }} style={{ background: s.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Staff</button>
                  </div>

                  {staffLoading ? (
                    <div style={{ color: s.muted, padding: 20, textAlign: "center" }}>Loading staff...</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {staffList.map(member => (
                        <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 14, background: "#1a1a1a", border: `1px solid ${s.border}`, borderRadius: 12, padding: "12px 16px", opacity: member.isActive ? 1 : 0.5 }}>
                          {/* Avatar */}
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", background: member.avatarUrl ? "transparent" : s.accent + "30", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: `2px solid ${s.border}` }}
                              onClick={() => {
                                setEditStaff(member);
                                editFileInputRef.current?.click();
                              }}>
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ fontSize: 18, fontWeight: 700, color: s.accent }}>{member.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: s.card, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer" }}
                              onClick={() => {
                                setEditStaff(member);
                                editFileInputRef.current?.click();
                              }}>
                              +
                            </div>
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                            <div style={{ fontSize: 12, color: s.muted }}>{member.role || "No role"}{member.email ? ` | ${member.email}` : ""}</div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleToggleStaffActive(member)} style={{ background: "transparent", border: `1px solid ${member.isActive ? "#f59e0b40" : "#22c55e40"}`, color: member.isActive ? "#f59e0b" : "#22c55e", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                              {member.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button onClick={() => handleDeleteStaff(member.id)} style={{ background: "transparent", border: "1px solid #ef444440", color: "#ef4444", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hidden file input for editing existing staff avatar */}
                  <input ref={editFileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && editStaff) {
                      await handleUpdateStaffAvatar(editStaff.id, file);
                      setEditStaff(null);
                    }
                    e.target.value = "";
                  }} />

                  {/* Add staff form */}
                  {showAddStaff && (
                    <div style={{ marginTop: 16, background: "#1a1a1a", border: `1px solid ${s.border}`, borderRadius: 12, padding: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>New Staff Member</h3>

                      {/* Avatar upload */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: avatarPreview ? "transparent" : s.accent + "20", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: `2px dashed ${s.border}`, cursor: "pointer" }}
                          onClick={() => fileInputRef.current?.click()}>
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: 12, color: s.muted }}>Photo</span>
                          )}
                        </div>
                        <div>
                          <button onClick={() => fileInputRef.current?.click()} style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.text, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                            {avatarPreview ? "Change Photo" : "Upload Photo"}
                          </button>
                          {avatarPreview && (
                            <button onClick={() => setAvatarPreview(null)} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 12, cursor: "pointer", marginLeft: 8 }}>Remove</button>
                          )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await handleFileToBase64(file);
                              setAvatarPreview(base64);
                            } catch { alert("Image too large (max 500KB)"); }
                          }
                        }} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 12, color: s.muted }}>Name *</label>
                          <input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid #ffffff15", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: s.muted }}>Role</label>
                          <input value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} placeholder="e.g. Barber, Stylist" style={{ background: "#0a0a0a", border: "1px solid #ffffff15", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: s.muted }}>Email</label>
                          <input value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid #ffffff15", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: s.muted }}>Phone</label>
                          <input value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} style={{ background: "#0a0a0a", border: "1px solid #ffffff15", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: s.text, width: "100%", boxSizing: "border-box", outline: "none" }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                        <button onClick={() => { setShowAddStaff(false); setAvatarPreview(null); }} style={{ flex: 1, background: "transparent", border: `1px solid ${s.border}`, color: s.muted, borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                        <button onClick={handleAddStaff} disabled={staffSaving || !newStaff.name} style={{ flex: 1, background: s.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: staffSaving || !newStaff.name ? 0.5 : 1 }}>{staffSaving ? "Adding..." : "Add Staff"}</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
