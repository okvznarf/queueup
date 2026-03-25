"use client";
import { useState, useEffect, useRef } from "react";

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

const bookingCss = `
@keyframes bk-fade-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes bk-scale-in{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
@keyframes bk-check-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes bk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes bk-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
.bk-step-content{animation:bk-fade-in 0.4s cubic-bezier(0.16,1,0.3,1) both}
.bk-card{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.bk-card:hover{transform:translateY(-2px)}
.bk-btn{transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.bk-btn:hover:not(:disabled){transform:translateY(-1px)}
.bk-btn:active:not(:disabled){transform:scale(0.97)}
.bk-slot{transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}
.bk-slot:hover:not(:disabled){transform:translateY(-1px)}
.bk-date{transition:all 0.25s cubic-bezier(0.16,1,0.3,1)}
.bk-date:hover:not(:disabled){transform:translateY(-2px)}
.bk-input{transition:border-color 0.25s ease,box-shadow 0.25s ease}
.bk-input:focus{outline:none}
.bk-confirmed{animation:bk-fade-in 0.6s cubic-bezier(0.16,1,0.3,1) both}
.bk-check-circle{animation:bk-scale-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both}
.bk-confirmed-title{animation:bk-fade-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.25s both}
.bk-confirmed-card{animation:bk-fade-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.35s both}
.bk-confirmed-actions{animation:bk-fade-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.45s both}
`;

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
  const [stepKey, setStepKey] = useState(0);

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

  const goStep = (n: number) => {
    setStep(n);
    setStepKey(k => k + 1);
  };

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
    setConfirmed(false); setCreateAccount(false); setError(""); setStepKey(k => k + 1);
  };

  const handleAddToCalendar = () => {
    if (!selDate || !selSlot || !service) return;
    const [h, m] = selSlot.startTime.split(":").map(Number);
    const start = new Date(selDate);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (service.duration || 60));
    const pad = (n: number) => n.toString().padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const title = encodeURIComponent(`${service.name} — ${shop.name}`);
    const details = encodeURIComponent([
      service.name,
      staffMember ? `${shop.staffLabel}: ${staffMember.name}` : "",
      service.price ? `Price: $${service.price}` : "",
    ].filter(Boolean).join("\n"));
    const location = encodeURIComponent(shop.address || shop.name);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
    window.open(url, "_blank");
  };

  const s = {
    accent, bg: shop.darkMode ? "#111" : "#fff", card: shop.darkMode ? "#1a1a1a" : "#f7f6f4",
    cardHover: shop.darkMode ? "#222" : "#f0efed",
    border: shop.darkMode ? "#ffffff15" : "#00000012", text: shop.darkMode ? "#e8e4dd" : "#1a1a1a",
    muted: shop.darkMode ? "#888" : "#666", dim: shop.darkMode ? "#555" : "#aaa",
    shadow: shop.darkMode ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)",
    shadowHover: shop.darkMode ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.1)",
  };
  const containerStyle: React.CSSProperties = { fontFamily: "'Outfit', system-ui, -apple-system, sans-serif", background: s.bg, minHeight: "100vh", maxWidth: 640, margin: "0 auto", padding: "28px 20px 100px", color: s.text };
  const inputStyle: React.CSSProperties = { background: s.card, border: "1.5px solid " + s.border, borderRadius: 12, padding: "13px 16px", fontSize: 14, color: s.text, width: "100%", boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit" };

  if (confirmed) {
    return (
      <div style={containerStyle}>
        <style dangerouslySetInnerHTML={{__html: bookingCss}} />
        <div className="bk-confirmed" style={{ textAlign: "center", paddingTop: 48 }}>
          <div className="bk-check-circle" style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: `0 8px 32px ${accent}40` }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={s.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, strokeDashoffset: 0 }}>
              <path d="M20 6L9 17l-5-5" style={{ animation: "bk-check-draw 0.5s ease 0.4s both" }} />
            </svg>
          </div>
          <div className="bk-confirmed-title">
            <h1 style={{ fontSize: 28, fontWeight: 700, color: s.text, margin: 0, letterSpacing: "-0.02em" }}>{shop.bookingLabel} Confirmed!</h1>
            <p style={{ color: s.muted, marginTop: 8, fontSize: 15 }}>You are all set. See you soon.</p>
          </div>
          <div className="bk-confirmed-card" style={{ background: s.card, border: "1px solid " + s.border, borderRadius: 16, padding: 22, margin: "32px auto", maxWidth: 380, textAlign: "left", boxShadow: s.shadow }}>
            <Row label={shop.serviceLabel} value={service?.name + (service?.price ? " - $" + service.price : "")} s={s} accent={accent} />
            {staffMember && <Row label={shop.staffLabel} value={staffMember.name} s={s} accent={accent} />}
            {shop.showPartySize && <Row label="Party Size" value={partySize + " guests"} s={s} accent={accent} />}
            {shop.showVehicleInfo && <Row label="Vehicle" value={vehicleInfo} s={s} accent={accent} />}
            <Row label="Date" value={DAYS[selDate!.getDay()] + ", " + MONTHS[selDate!.getMonth()] + " " + selDate!.getDate()} s={s} accent={accent} />
            <Row label="Time" value={selSlot.label} s={s} accent={accent} />
            <div style={{ height: 1, background: accent + "22", margin: "6px 0" }} />
            <Row label="Name" value={form.name} s={s} accent={accent} />
            <Row label="Phone" value={form.phone} s={s} accent={accent} />
          </div>
          <p style={{ color: s.dim, fontSize: 13, fontStyle: "italic" }}>Confirmation sent to {form.email}</p>
          {createAccount && <p style={{ color: "#22c55e", fontSize: 13, marginTop: 8 }}>Account created! Manage bookings at <a href="/customer/dashboard" style={{ color: accent, fontWeight: 600 }}>My Bookings</a></p>}
          <div className="bk-confirmed-actions" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={handleAddToCalendar} className="bk-btn" style={{ background: "transparent", color: accent, border: "1.5px solid " + accent + "35", borderRadius: 12, padding: "13px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add to Calendar</button>
            <button onClick={reset} className="bk-btn" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, color: s.bg, border: "none", borderRadius: 12, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 16px ${accent}30` }}>Book Another</button>
            <a href="/customer/dashboard" className="bk-btn" style={{ background: "transparent", color: accent, border: "1.5px solid " + accent + "35", borderRadius: 12, padding: "13px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>My Bookings</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style dangerouslySetInnerHTML={{__html: bookingCss}} />
      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 3, color: accent, textTransform: "uppercase" as const, opacity: 0.9 }}>{shop.name}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "14px 0 0", color: s.text, letterSpacing: "-0.02em" }}>Book Your {shop.bookingLabel}</h1>
          <p style={{ color: s.muted, fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>Select a {shop.serviceLabel.toLowerCase()} and pick a time.</p>
        </div>
        <a href={"/customer/login?shop=" + shop.slug} className="bk-btn" style={{ fontSize: 13, color: accent, textDecoration: "none", border: "1.5px solid " + accent + "35", borderRadius: 10, padding: "8px 16px", fontWeight: 600, display: "inline-block" }}>Sign In</a>
      </header>

      {error && <div style={{ background: "#ef444410", border: "1px solid #ef444430", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#ef4444", fontSize: 13, fontWeight: 500, animation: "bk-fade-in 0.3s ease" }}>{error}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "20px 0 28px", overflowX: "auto", paddingBottom: 4 }}>
        {steps.map((st, i) => (
          <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, transition: "all 0.3s ease",
              background: i < step ? accent : i === step ? accent : "transparent",
              border: "2px solid " + (i <= step ? accent : s.dim + "60"),
              color: i <= step ? s.bg : s.dim,
              boxShadow: i === step ? `0 0 12px ${accent}30` : "none",
            }}>{i < step ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13 4.5l-7 7L2.5 8" stroke={s.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : i + 1}</div>
            <span style={{ fontSize: 11, fontWeight: i === step ? 600 : 500, color: i <= step ? s.text : s.dim, transition: "all 0.3s ease" }}>{st.label}</span>
            {i < steps.length - 1 && <div style={{ width: 18, height: 2, background: i < step ? accent : s.border, borderRadius: 1, transition: "background 0.3s ease" }} />}
          </div>
        ))}
      </div>

      <div key={stepKey} className="bk-step-content">
        {currentStep?.id === "duration" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>How long is your stay?</h2>
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
                }} className="bk-card" style={{
                  background: selDuration === opt.value ? accent + "15" : s.card,
                  border: "2px solid " + (selDuration === opt.value ? accent : s.border),
                  borderRadius: 14, padding: "16px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  color: selDuration === opt.value ? accent : s.text, fontFamily: "inherit",
                  boxShadow: selDuration === opt.value ? `0 4px 16px ${accent}20` : s.shadow,
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep?.id === "service" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>Choose {shop.serviceLabel}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12 }}>
              {shop.services.map((sv: any) => (
                <button key={sv.id} onClick={() => setSelService(sv.id)} className="bk-card" style={{
                  background: selService === sv.id ? accent + "12" : s.card,
                  border: "2px solid " + (selService === sv.id ? accent : s.border),
                  borderRadius: 14, padding: "18px 14px", textAlign: "center" as const, cursor: "pointer", color: s.text,
                  fontFamily: "inherit", boxShadow: selService === sv.id ? `0 4px 16px ${accent}20` : s.shadow,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{sv.name}</div>
                  <div style={{ fontSize: 12, color: s.muted, marginTop: 3 }}>{sv.duration} min</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: accent, marginTop: 10, letterSpacing: "-0.02em" }}>{sv.price > 0 ? "$" + sv.price : "Free"}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep?.id === "staff" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>Choose Your {shop.staffLabel}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12 }}>
              {shop.staff.map((st: any) => (
                <button key={st.id} onClick={() => setSelStaff(st.id)} className="bk-card" style={{
                  background: selStaff === st.id ? accent + "12" : s.card,
                  border: "2px solid " + (selStaff === st.id ? accent : s.border),
                  borderRadius: 14, padding: 20, textAlign: "center" as const, cursor: "pointer", color: s.text,
                  fontFamily: "inherit", boxShadow: selStaff === st.id ? `0 4px 16px ${accent}20` : s.shadow,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 16, color: s.bg, margin: "0 auto 12px",
                    boxShadow: `0 4px 12px ${accent}30`,
                  }}>{st.name.split(" ").map((n: string) => n[0]).join("")}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{st.name}</div>
                  <div style={{ fontSize: 12, color: accent, marginTop: 3, fontWeight: 500 }}>{st.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep?.id === "party" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>How Many Guests?</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[1,2,3,4,5,6,7,8].map((n) => (
                <button key={n} onClick={() => setPartySize(n)} className="bk-card" style={{
                  background: partySize === n ? accent + "15" : s.card,
                  border: "2px solid " + (partySize === n ? accent : s.border),
                  borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  color: partySize === n ? accent : s.text, fontFamily: "inherit", minWidth: 48,
                  boxShadow: partySize === n ? `0 4px 16px ${accent}20` : "none",
                }}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {currentStep?.id === "vehicle" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>Vehicle Information</h2>
            <input value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="e.g. 2020 Honda Civic" className="bk-input" style={{...inputStyle, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)"}} onFocus={(e) => e.target.style.borderColor = accent + "60"} onBlur={(e) => e.target.style.borderColor = s.border} />
          </div>
        )}

        {currentStep?.id === "datetime" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>Pick a Date</h2>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {dates.map((d, i) => {
                const dayName = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][d.getDay()];
                const wh = shop.workingHours.find((h: any) => h.day === dayName);
                const closed = !wh || wh.isClosed;
                const isSel = selDate && d.toDateString() === selDate.toDateString();
                return (
                  <button key={i} disabled={closed} onClick={() => { setSelDate(d); setSelSlot(null); }} className="bk-date" style={{
                    background: isSel ? accent + "15" : s.card,
                    border: "2px solid " + (isSel ? accent : s.border),
                    borderRadius: 14, padding: "12px 14px", textAlign: "center" as const, minWidth: 58,
                    cursor: closed ? "not-allowed" : "pointer", opacity: closed ? 0.3 : 1, color: s.text,
                    fontFamily: "inherit", boxShadow: isSel ? `0 4px 16px ${accent}20` : "none",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: s.muted, textTransform: "uppercase" as const, letterSpacing: 1.2 }}>{DAYS[d.getDay()]}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: isSel ? accent : s.text, margin: "3px 0", letterSpacing: "-0.02em" }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10, color: s.muted, fontWeight: 500 }}>{MONTHS[d.getMonth()]}</div>
                  </button>
                );
              })}
            </div>
            {selDate && slotsLoading && <p style={{ color: s.muted, marginTop: 18, fontSize: 14 }}>Loading available times...</p>}
            {selDate && !slotsLoading && slots.length > 0 && (
              <div style={{ animation: "bk-fade-in 0.3s ease" }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 14px", color: s.text, letterSpacing: "-0.01em" }}>Available Times</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {slots.map((sl: any, i: number) => (
                    <button key={i} disabled={!sl.available} onClick={() => setSelSlot(sl)} className="bk-slot" style={{
                      background: selSlot === sl ? accent + "15" : !sl.available ? (shop.darkMode ? "#0a0a0a" : "#f0f0f0") : s.card,
                      border: "1.5px solid " + (selSlot === sl ? accent : s.border), borderRadius: 10,
                      padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                      cursor: !sl.available ? "not-allowed" : "pointer",
                      color: !sl.available ? s.dim : selSlot === sl ? accent : s.text,
                      textDecoration: !sl.available ? "line-through" : "none",
                      boxShadow: selSlot === sl ? `0 2px 12px ${accent}25` : "none",
                    }}>{sl.label}</button>
                  ))}
                </div>
              </div>
            )}
            {selDate && !slotsLoading && slots.length === 0 && <p style={{ color: s.dim, fontStyle: "italic", marginTop: 18, fontSize: 14 }}>Closed on this day</p>}
          </div>
        )}

        {currentStep?.id === "details" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>Your Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 7, fontWeight: 500 }}>Full Name *</label><input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="John Doe" className="bk-input" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }} onBlur={(e) => { e.target.style.borderColor = s.border; e.target.style.boxShadow = "none"; }} /></div>
              <div><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 7, fontWeight: 500 }}>Phone *</label><input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+385 91 234 5678" className="bk-input" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }} onBlur={(e) => { e.target.style.borderColor = s.border; e.target.style.boxShadow = "none"; }} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 7, fontWeight: 500 }}>Email *</label><input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="ime@email.com" className="bk-input" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }} onBlur={(e) => { e.target.style.borderColor = s.border; e.target.style.boxShadow = "none"; }} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 7, fontWeight: 500 }}>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Any special requests..." className="bk-input" style={{ ...inputStyle, minHeight: 64, resize: "vertical" as const }} onFocus={(e) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }} onBlur={(e) => { e.target.style.borderColor = s.border; e.target.style.boxShadow = "none"; }} /></div>
            </div>
            <div style={{ marginTop: 22, background: s.card, border: "1.5px solid " + s.border, borderRadius: 14, padding: 18, boxShadow: s.shadow }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} style={{ width: 18, height: 18, accentColor: accent }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: s.text }}>Create an account</div>
                  <div style={{ fontSize: 12, color: s.muted, marginTop: 1 }}>Manage and cancel your bookings online</div>
                </div>
              </label>
              {createAccount && (
                <div style={{ marginTop: 14, animation: "bk-fade-in 0.3s ease" }}>
                  <label style={{ fontSize: 13, color: s.muted, display: "block", marginBottom: 7, fontWeight: 500 }}>Password (min 8 characters)</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Create a password" className="bk-input" style={inputStyle} onFocus={(e) => { e.target.style.borderColor = accent + "60"; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }} onBlur={(e) => { e.target.style.borderColor = s.border; e.target.style.boxShadow = "none"; }} />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep?.id === "confirm" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: s.text, letterSpacing: "-0.01em" }}>Review and Confirm</h2>
            <div style={{ background: s.card, border: "1.5px solid " + s.border, borderRadius: 16, padding: 22, boxShadow: s.shadow }}>
              {!shop.showPartySize && <Row label={shop.serviceLabel} value={service?.name + (service?.price ? " - $" + service.price : "")} s={s} accent={accent} />}
              <Row label="Duration" value={(selDuration || service?.duration) + " min"} s={s} accent={accent} />
              {staffMember && <Row label={shop.staffLabel} value={staffMember.name} s={s} accent={accent} />}
              {shop.showPartySize && <Row label="Party Size" value={partySize + " guests"} s={s} accent={accent} />}
              {shop.showVehicleInfo && <Row label="Vehicle" value={vehicleInfo} s={s} accent={accent} />}
              <Row label="Date" value={DAYS[selDate!.getDay()] + ", " + MONTHS[selDate!.getMonth()] + " " + selDate!.getDate()} s={s} accent={accent} />
              <Row label="Time" value={selSlot.label} s={s} accent={accent} />
              <div style={{ height: 1, background: accent + "22", margin: "6px 0" }} />
              <Row label="Name" value={form.name} s={s} accent={accent} />
              <Row label="Phone" value={form.phone} s={s} accent={accent} />
              <Row label="Email" value={form.email} s={s} accent={accent} />
              {form.notes && <Row label="Notes" value={form.notes} s={s} accent={accent} />}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid " + s.border }}>
        {step > 0 && <button onClick={() => goStep(step - 1)} className="bk-btn" style={{ background: "transparent", color: s.muted, border: "1.5px solid " + s.border, borderRadius: 12, padding: "13px 22px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Back</button>}
        <div style={{ flex: 1 }} />
        {currentStep?.id !== "confirm" ? (
          <button disabled={!canNext()} onClick={() => goStep(step + 1)} className="bk-btn" style={{
            background: canNext() ? `linear-gradient(135deg, ${accent}, ${accent}dd)` : s.card,
            color: canNext() ? s.bg : s.dim, border: "none", borderRadius: 12,
            padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: canNext() ? "pointer" : "default",
            fontFamily: "inherit", boxShadow: canNext() ? `0 4px 16px ${accent}30` : "none",
          }}>Continue</button>
        ) : (
          <button disabled={submitting} onClick={handleConfirm} className="bk-btn" style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
            color: s.bg, border: "none", borderRadius: 12,
            padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", boxShadow: `0 4px 20px ${accent}35`,
          }}>{submitting ? "Booking..." : "Confirm " + shop.bookingLabel}</button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, s, accent }: { label: string; value: string; s: any; accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + s.border + "80" }}>
      <span style={{ color: s.muted, fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span style={{ color: s.text, fontSize: 13, fontWeight: 600, textAlign: "right" as const, maxWidth: "60%" }}>{value}</span>
    </div>
  );
}
