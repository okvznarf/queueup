"use client";
import { useState, useEffect } from "react";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getNext14Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

type Shop = any;

export default function BookingClient({ shop }: { shop: Shop }) {
  const [step, setStep] = useState(0);
  const [selService, setSelService] = useState<string | null>(null);
  const [selDuration, setSelDuration] = useState<number | null>(null);
  const [selStaff, setSelStaff] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<Date | null>(null);
  const [selSlot, setSelSlot] = useState<any>(null);
  const [partySize, setPartySize] = useState(2);
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", password: "" });
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [error, setError] = useState("");

  const accent = shop.primaryColor || "#C8A45A";
  const dates = getNext14Days();
  const service = shop.services.find((s: any) => s.id === selService);
  const staffMember = shop.staff.find((s: any) => s.id === selStaff);

  useEffect(() => {
    if (selDate && selService) {
      setSlotsLoading(true);
      const duration = selDuration || service?.duration || 30;
      let url = "/api/availability?shopId=" + shop.id + "&date=" + selDate.toISOString().split("T")[0] + "&duration=" + duration;
      if (selStaff) url += "&staffId=" + selStaff;
      fetch(url).then(r => r.json()).then(data => {
        setSlots(data);
        setSlotsLoading(false);
      }).catch(() => setSlotsLoading(false));
    }
  }, [selDate, selStaff, selService]);

  const steps: { id: string; label: string }[] = [];
  if (shop.showPartySize) {
    steps.push({ id: "duration", label: "Duration" });
  } else {
    steps.push({ id: "service", label: shop.serviceLabel || "Service" });
  }
  if (shop.showStaffPicker && shop.staff.length > 0) steps.push({ id: "staff", label: shop.staffLabel || "Staff" });
  if (shop.showPartySize) steps.push({ id: "party", label: "Party Size" });
  if (shop.showVehicleInfo) steps.push({ id: "vehicle", label: "Vehicle" });
  steps.push({ id: "datetime", label: "Date & Time" });
  steps.push({ id: "details", label: "Details" });
  steps.push({ id: "confirm", label: "Confirm" });

  const currentStep = steps[step];

  const canNext = () => {
    if (!currentStep) return false;
    if (currentStep.id === "duration") return selDuration !== null;
    if (currentStep.id === "service") return selService !== null;
    if (currentStep.id === "staff") return selStaff !== null;
    if (currentStep.id === "party") return partySize > 0;
    if (currentStep.id === "vehicle") return vehicleInfo.trim().length > 0;
    if (currentStep.id === "datetime") return selDate && selSlot;
    if (currentStep.id === "details") {
      const base = form.name && form.phone && form.email;
      if (createAccount) return base && form.password.length >= 8;
      return base;
    }
    return true;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (createAccount && form.password) {
        await fetch("/api/auth/register-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password, shopId: shop.id }),
        });
      }
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id, serviceId: selService, staffId: selStaff,
          date: selDate?.toISOString().split("T")[0],
          startTime: selSlot.startTime,
          customerName: form.name, customerPhone: form.phone, customerEmail: form.email,
          notes: form.notes, partySize: shop.showPartySize ? partySize : null,
          vehicleInfo: shop.showVehicleInfo ? vehicleInfo : null,
        }),
      });
      const data = await res.json();
      if (res.ok) setConfirmed(true);
      else setError(data.error || "Booking failed");
    } catch (e) { setError("Connection error"); }
    setSubmitting(false);
  };

  const reset = () => {
    setStep(0); setSelService(null); setSelDuration(null); setSelStaff(null); setSelDate(null); setSelSlot(null);
    setPartySize(2); setVehicleInfo(""); setForm({ name: "", phone: "", email: "", notes: "", password: "" });
    setConfirmed(false); setCreateAccount(false); setError("");
  };

  const s = {
    accent, bg: shop.darkMode ? "#111" : "#fff", card: shop.darkMode ? "#1a1a1a" : "#f5f5f5",
    border: shop.darkMode ? "#ffffff15" : "#00000015", text: shop.darkMode ? "#e8e4dd" : "#1a1a1a",
    muted: shop.darkMode ? "#888" : "#666", dim: shop.darkMode ? "#555" : "#aaa",
  };
  const containerStyle: React.CSSProperties = { fontFamily: "system-ui, -apple-system, sans-serif", background: s.bg, minHeight: "100vh", maxWidth: 640, margin: "0 auto", padding: "28px 20px 100px", color: s.text };
  const inputStyle: React.CSSProperties = { background: s.card, border: "1.5px solid " + s.border, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box" as const, outline: "none" };

  if (confirmed) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: s.bg, margin: "0 auto 24px" }}>OK</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: s.text, margin: 0 }}>{shop.bookingLabel} Confirmed!</h1>
          <p style={{ color: s.muted, marginTop: 6 }}>You are all set. See you soon.</p>
          <div style={{ background: s.card, border: "1px solid " + s.border, borderRadius: 12, padding: 18, margin: "28px auto", maxWidth: 380, textAlign: "left" }}>
            <Row label={shop.serviceLabel} value={service?.name + (service?.price ? " - $" + service.price : "")} s={s} />
            {staffMember && <Row label={shop.staffLabel} value={staffMember.name} s={s} />}
            {shop.showPartySize && <Row label="Party Size" value={partySize + " guests"} s={s} />}
            {shop.showVehicleInfo && <Row label="Vehicle" value={vehicleInfo} s={s} />}
            <Row label="Date" value={DAYS[selDate!.getDay()] + ", " + MONTHS[selDate!.getMonth()] + " " + selDate!.getDate()} s={s} />
            <Row label="Time" value={selSlot.label} s={s} />
            <div style={{ height: 1, background: accent + "33", margin: "4px 0" }} />
            <Row label="Name" value={form.name} s={s} />
            <Row label="Phone" value={form.phone} s={s} />
          </div>
          <p style={{ color: s.dim, fontSize: 13, fontStyle: "italic" }}>Confirmation sent to {form.email}</p>
          {createAccount && <p style={{ color: "#22c55e", fontSize: 13, marginTop: 8 }}>Account created! Manage bookings at <a href="/customer/dashboard" style={{ color: accent }}>My Bookings</a></p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <button onClick={reset} style={{ background: accent, color: s.bg, border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Book Another</button>
            <a href="/customer/dashboard" style={{ background: "transparent", color: accent, border: "1px solid " + accent + "40", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>My Bookings</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 2.5, color: accent, textTransform: "uppercase" as const }}>{shop.name}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "12px 0 0", color: s.text }}>Book Your {shop.bookingLabel}</h1>
          <p style={{ color: s.muted, fontSize: 14, marginTop: 5 }}>Select a {shop.serviceLabel.toLowerCase()} and pick a time.</p>
        </div>
        <a href={"/customer/login?shop=" + shop.slug} style={{ fontSize: 13, color: accent, textDecoration: "none", border: "1px solid " + accent + "40", borderRadius: 8, padding: "7px 14px" }}>Sign In</a>
      </header>

      {error && <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "20px 0 24px", overflowX: "auto", paddingBottom: 4 }}>
        {steps.map((st, i) => (
          <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i <= step ? accent : "transparent", border: "2px solid " + (i <= step ? accent : s.dim), color: i <= step ? s.bg : s.dim }}>{i < step ? "v" : i + 1}</div>
            <span style={{ fontSize: 11, fontWeight: 500, color: i <= step ? s.text : s.dim }}>{st.label}</span>
            {i < steps.length - 1 && <div style={{ width: 18, height: 2, background: i < step ? accent : "#333", borderRadius: 1 }} />}
          </div>
        ))}
      </div>

      {currentStep?.id === "duration" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>How long is your stay?</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "45 min", value: 45 },
              { label: "1 hour", value: 60 },
              { label: "1.5 hours", value: 90 },
              { label: "2 hours", value: 120 },
              { label: "3 hours", value: 180 },
            ].map((opt) => (
              <button key={opt.value} onClick={() => {
                setSelDuration(opt.value);
                if (shop.services.length > 0) setSelService(shop.services[0].id);
              }} style={{ background: selDuration === opt.value ? accent + "18" : s.card, border: "2px solid " + (selDuration === opt.value ? accent : s.border), borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: selDuration === opt.value ? accent : s.text }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep?.id === "service" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>Choose {shop.serviceLabel}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
            {shop.services.map((sv: any) => (
              <button key={sv.id} onClick={() => setSelService(sv.id)} style={{ background: selService === sv.id ? accent + "18" : s.card, border: "2px solid " + (selService === sv.id ? accent : s.border), borderRadius: 12, padding: "16px 12px", textAlign: "center" as const, cursor: "pointer", color: s.text }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{sv.name}</div>
                <div style={{ fontSize: 12, color: s.muted, marginTop: 2 }}>{sv.duration} min</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: accent, marginTop: 8 }}>{sv.price > 0 ? "$" + sv.price : "Free"}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep?.id === "staff" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>Choose Your {shop.staffLabel}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12 }}>
            {shop.staff.map((st: any) => (
              <button key={st.id} onClick={() => setSelStaff(st.id)} style={{ background: selStaff === st.id ? accent + "18" : s.card, border: "2px solid " + (selStaff === st.id ? accent : s.border), borderRadius: 12, padding: 18, textAlign: "center" as const, cursor: "pointer", color: s.text }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: s.bg, margin: "0 auto 10px" }}>{st.name.split(" ").map((n: string) => n[0]).join("")}</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</div>
                <div style={{ fontSize: 12, color: accent, marginTop: 2 }}>{st.role}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep?.id === "party" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>How Many Guests?</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[1,2,3,4,5,6,7,8].map((n) => (
              <button key={n} onClick={() => setPartySize(n)} style={{ background: partySize === n ? accent + "18" : s.card, border: "2px solid " + (partySize === n ? accent : s.border), borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: partySize === n ? accent : s.text }}>{n}</button>
            ))}
          </div>
        </div>
      )}

      {currentStep?.id === "vehicle" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>Vehicle Information</h2>
          <input value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="e.g. 2020 Honda Civic" style={inputStyle} />
        </div>
      )}

      {currentStep?.id === "datetime" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>Pick a Date</h2>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 8 }}>
            {dates.map((d, i) => {
              const dayName = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][d.getDay()];
              const wh = shop.workingHours.find((h: any) => h.day === dayName);
              const closed = !wh || wh.isClosed;
              const isSel = selDate && d.toDateString() === selDate.toDateString();
              return (
                <button key={i} disabled={closed} onClick={() => { setSelDate(d); setSelSlot(null); }} style={{ background: isSel ? accent + "18" : s.card, border: "2px solid " + (isSel ? accent : s.border), borderRadius: 12, padding: "10px 14px", textAlign: "center" as const, minWidth: 54, cursor: closed ? "not-allowed" : "pointer", opacity: closed ? 0.3 : 1, color: s.text }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: s.muted, textTransform: "uppercase" as const, letterSpacing: 1 }}>{DAYS[d.getDay()]}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: isSel ? accent : s.text, margin: "2px 0" }}>{d.getDate()}</div>
                  <div style={{ fontSize: 10, color: s.muted }}>{MONTHS[d.getMonth()]}</div>
                </button>
              );
            })}
          </div>
          {selDate && slotsLoading && <p style={{ color: s.muted, marginTop: 16 }}>Loading available times...</p>}
          {selDate && !slotsLoading && slots.length > 0 && (
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: "22px 0 14px", color: s.text }}>Available Times</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {slots.map((sl: any, i: number) => (
                  <button key={i} disabled={!sl.available} onClick={() => setSelSlot(sl)} style={{ background: selSlot === sl ? accent + "18" : !sl.available ? "#0a0a0a" : s.card, border: "1.5px solid " + (selSlot === sl ? accent : s.border), borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: !sl.available ? "not-allowed" : "pointer", color: !sl.available ? "#333" : selSlot === sl ? accent : s.text, textDecoration: !sl.available ? "line-through" : "none" }}>{sl.label}</button>
                ))}
              </div>
            </div>
          )}
          {selDate && !slotsLoading && slots.length === 0 && <p style={{ color: s.dim, fontStyle: "italic", marginTop: 16 }}>Closed on this day</p>}
        </div>
      )}

      {currentStep?.id === "details" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>Your Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Full Name *</label><input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="John Doe" style={inputStyle} /></div>
            <div><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Phone *</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+385 91 234 5678" style={inputStyle} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Email *</label><input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="ime@email.com" style={inputStyle} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Any special requests..." style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }} /></div>
          </div>
          <div style={{ marginTop: 20, background: s.card, border: "1px solid " + s.border, borderRadius: 12, padding: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} style={{ width: 18, height: 18, accentColor: accent }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.text }}>Create an account</div>
                <div style={{ fontSize: 12, color: s.muted }}>Manage and cancel your bookings online</div>
              </div>
            </label>
            {createAccount && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 6 }}>Password (min 8 characters)</label>
                <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Create a password" style={inputStyle} />
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep?.id === "confirm" && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: s.text }}>Review and Confirm</h2>
          <div style={{ background: s.card, border: "1px solid " + s.border, borderRadius: 12, padding: 18 }}>
            {!shop.showPartySize && <Row label={shop.serviceLabel} value={service?.name + (service?.price ? " - $" + service.price : "")} s={s} />}
            <Row label="Duration" value={(selDuration || service?.duration) + " min"} s={s} />
            {staffMember && <Row label={shop.staffLabel} value={staffMember.name} s={s} />}
            {shop.showPartySize && <Row label="Party Size" value={partySize + " guests"} s={s} />}
            {shop.showVehicleInfo && <Row label="Vehicle" value={vehicleInfo} s={s} />}
            <Row label="Date" value={DAYS[selDate!.getDay()] + ", " + MONTHS[selDate!.getMonth()] + " " + selDate!.getDate()} s={s} />
            <Row label="Time" value={selSlot.label} s={s} />
            <div style={{ height: 1, background: accent + "33", margin: "4px 0" }} />
            <Row label="Name" value={form.name} s={s} />
            <Row label="Phone" value={form.phone} s={s} />
            <Row label="Email" value={form.email} s={s} />
            {form.notes && <Row label="Notes" value={form.notes} s={s} />}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, paddingTop: 18, borderTop: "1px solid " + s.border }}>
        {step > 0 && <button onClick={() => setStep(step - 1)} style={{ background: "transparent", color: s.muted, border: "1.5px solid " + s.border, borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Back</button>}
        <div style={{ flex: 1 }} />
        {currentStep?.id !== "confirm" ? (
          <button disabled={!canNext()} onClick={() => setStep(step + 1)} style={{ background: accent, color: s.bg, border: "none", borderRadius: 10, padding: "12px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: canNext() ? 1 : 0.35 }}>Continue</button>
        ) : (
          <button disabled={submitting} onClick={handleConfirm} style={{ background: accent, color: s.bg, border: "none", borderRadius: 10, padding: "13px 30px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{submitting ? "Booking..." : "Confirm " + shop.bookingLabel}</button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, s }: { label: string; value: string; s: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid " + s.border }}>
      <span style={{ color: s.muted, fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span style={{ color: s.text, fontSize: 13, fontWeight: 600, textAlign: "right" as const, maxWidth: "60%" }}>{value}</span>
    </div>
  );
}