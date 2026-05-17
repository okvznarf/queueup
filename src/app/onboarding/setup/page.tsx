"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PackSummary = {
  slug: string;
  displayName: string;
  displayNamePlural: string;
  bookingModel: "FIXED_SLOT" | "DROP_OFF_WINDOW" | "QUEUE";
  pricing: {
    base: number;
    perUnit: number;
    unitLabel: string;
    unitLabelPlural: string;
    currency: string;
    includedAiCallsPerMonth: number;
    overageRateEur: number;
  };
  labels: {
    serviceLabel: string;
    serviceLabelPlural: string;
    staffLabel: string;
    staffLabelPlural: string;
    bookingLabel: string;
    bookingLabelPlural: string;
  };
  defaultServices: Array<{
    name: string;
    duration: number;
    price: number;
    description?: string;
    category?: string;
  }>;
  intake: {
    showVehicleInfo: boolean;
    showLicensePlate: boolean;
    showPartySize: boolean;
  };
  pitch: { headline: string; subheadline: string };
};

type ServiceRow = {
  id: string;
  name: string;
  duration: number;
  price: number;
  category?: string;
};

type HoursRow = {
  day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

const DAYS: HoursRow["day"][] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

const DAY_LABEL: Record<HoursRow["day"], string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

const DEFAULT_HOURS_BY_PACK: Record<string, HoursRow[]> = {
  MECHANIC: DAYS.map((d, i) => ({
    day: d,
    openTime: "08:00",
    closeTime: i === 5 ? "13:00" : "17:00",
    isClosed: i === 6,
  })),
  BARBER: DAYS.map((d, i) => ({
    day: d,
    openTime: "09:00",
    closeTime: i === 5 ? "15:00" : "19:00",
    isClosed: i === 6,
  })),
  DENTIST: DAYS.map((d, i) => ({
    day: d,
    openTime: "08:00",
    closeTime: "16:00",
    isClosed: i >= 5,
  })),
};

const ACCENT = "#C8A45A";
const BG = "#0a0a0a";
const CARD = "#141414";
const TEXT = "#e8e4dd";
const MUTED = "#666";
const INPUT_BG = "#1a1a1a";
const INPUT_BORDER = "1.5px solid #ffffff15";
const ERROR_COLOR = "#ef4444";
const SUCCESS_COLOR = "#10b981";

const CROATIAN_MAP: Record<string, string> = {
  "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "d",
  "Č": "c", "Ć": "c", "Š": "s", "Ž": "z", "Đ": "d",
};

function slugify(input: string): string {
  return input
    .split("")
    .map((ch) => CROATIAN_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

export default function OnboardingWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [selectedPack, setSelectedPack] = useState<PackSummary | null>(null);

  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{
    state: "idle" | "checking" | "available" | "unavailable";
    reason?: string;
    suggestions?: string[];
  }>({ state: "idle" });

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [hours, setHours] = useState<HoursRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/verticals/list")
      .then((r) => r.json())
      .then((data: { packs: PackSummary[] }) => {
        setPacks(data.packs);
        setLoadingPacks(false);
      })
      .catch(() => setLoadingPacks(false));
  }, []);

  // Auto-slugify when shop name changes (unless user has manually edited the slug)
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(shopName));
  }, [shopName, slugTouched]);

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus({ state: "idle" });
      return;
    }
    setSlugStatus({ state: "checking" });
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shops/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugStatus(
          data.available
            ? { state: "available" }
            : { state: "unavailable", reason: data.reason, suggestions: data.suggestions },
        );
      } catch {
        setSlugStatus({ state: "idle" });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [slug]);

  const handlePackSelected = useCallback((pack: PackSummary) => {
    setSelectedPack(pack);
    setServices(
      pack.defaultServices.map((s) => ({
        id: uid(),
        name: s.name,
        duration: s.duration,
        price: s.price,
        category: s.category,
      })),
    );
    setHours(DEFAULT_HOURS_BY_PACK[pack.slug] ?? DEFAULT_HOURS_BY_PACK.BARBER);
    setStep(2);
  }, []);

  const addService = () => {
    setServices((s) => [...s, { id: uid(), name: "", duration: 30, price: 0 }]);
  };

  const removeService = (id: string) => {
    setServices((s) => s.filter((row) => row.id !== id));
  };

  const updateService = (id: string, patch: Partial<ServiceRow>) => {
    setServices((s) => s.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const resetServicesToDefaults = () => {
    if (!selectedPack) return;
    setServices(
      selectedPack.defaultServices.map((s) => ({
        id: uid(),
        name: s.name,
        duration: s.duration,
        price: s.price,
        category: s.category,
      })),
    );
  };

  const updateHours = (idx: number, patch: Partial<HoursRow>) => {
    setHours((rows) => rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const servicesValid = useMemo(
    () =>
      services.length > 0 &&
      services.every(
        (s) =>
          s.name.trim().length > 0 &&
          Number.isFinite(s.duration) &&
          s.duration >= 5 &&
          s.duration <= 480 &&
          Number.isFinite(s.price) &&
          s.price >= 0,
      ),
    [services],
  );

  const canGoTo3 = !!selectedPack;
  const canGoTo4 = !!shopName.trim() && slugStatus.state === "available";
  const canGoTo5 = servicesValid;
  const canSubmit = canGoTo4 && canGoTo5;

  const submit = async () => {
    if (!selectedPack || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName.trim(),
          city: city.trim() || undefined,
          slug,
          businessType: selectedPack.slug,
          services: services.map((s) => ({
            name: s.name.trim(),
            duration: s.duration,
            price: s.price,
            category: s.category,
          })),
          workingHours: hours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(data.adminUrl ?? `/admin/${slug}/appointments`);
    } catch {
      setError("Connection error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: BG,
        minHeight: "100vh",
        color: TEXT,
        padding: "40px 16px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 2, color: ACCENT }}>QUEUEUP</div>
          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 4px" }}>Set up your shop</h1>
          <p style={{ color: MUTED, fontSize: 14 }}>5 minutes. Edit anything later in your dashboard.</p>
        </div>

        <StepIndicator current={step} />

        {error && (
          <div
            style={{
              background: `${ERROR_COLOR}18`,
              border: `1px solid ${ERROR_COLOR}40`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              color: ERROR_COLOR,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ background: CARD, border: "1px solid #ffffff10", borderRadius: 16, padding: 32 }}>
          {step === 1 && (
            <Step1BusinessType
              packs={packs}
              loading={loadingPacks}
              selected={selectedPack}
              onSelect={handlePackSelected}
            />
          )}

          {step === 2 && selectedPack && (
            <Step2BasicsAndSlug
              shopName={shopName}
              setShopName={setShopName}
              city={city}
              setCity={setCity}
              slug={slug}
              setSlug={(s) => {
                setSlug(s);
                setSlugTouched(true);
              }}
              slugStatus={slugStatus}
              pickSuggestion={(s) => {
                setSlug(s);
                setSlugTouched(true);
              }}
              pack={selectedPack}
            />
          )}

          {step === 3 && selectedPack && (
            <Step3Services
              services={services}
              addService={addService}
              removeService={removeService}
              updateService={updateService}
              resetDefaults={resetServicesToDefaults}
              pack={selectedPack}
            />
          )}

          {step === 4 && selectedPack && (
            <Step4Hours hours={hours} updateHours={updateHours} pack={selectedPack} />
          )}

          {step === 5 && selectedPack && (
            <Step5Review
              shopName={shopName}
              city={city}
              slug={slug}
              services={services}
              hours={hours}
              pack={selectedPack}
            />
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as typeof step) : s))}
            disabled={step === 1}
            style={{
              background: "transparent",
              border: INPUT_BORDER,
              color: TEXT,
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 14,
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.4 : 1,
            }}
          >
            Back
          </button>

          {step < 5 && (
            <button
              onClick={() => {
                if (step === 1 && !canGoTo3) return;
                if (step === 2 && !canGoTo4) return;
                if (step === 3 && !canGoTo5) return;
                setStep((s) => (s + 1) as typeof step);
              }}
              disabled={
                (step === 1 && !canGoTo3) ||
                (step === 2 && !canGoTo4) ||
                (step === 3 && !canGoTo5)
              }
              style={{
                background: ACCENT,
                border: "none",
                color: "#111",
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                opacity:
                  (step === 1 && !canGoTo3) ||
                  (step === 2 && !canGoTo4) ||
                  (step === 3 && !canGoTo5)
                    ? 0.5
                    : 1,
              }}
            >
              Continue
            </button>
          )}

          {step === 5 && (
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              style={{
                background: ACCENT,
                border: "none",
                color: "#111",
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                opacity: !canSubmit || submitting ? 0.5 : 1,
              }}
            >
              {submitting ? "Creating..." : "Create my shop"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const labels = ["Type", "Basics", "Services", "Hours", "Review"];
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: active ? ACCENT : done ? TEXT : MUTED,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: active ? ACCENT : done ? "#1a1a1a" : "transparent",
                border: active ? "none" : `1.5px solid ${done ? TEXT : MUTED}`,
                color: active ? "#111" : TEXT,
                fontWeight: 700,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done ? "✓" : n}
            </div>
            {label}
          </div>
        );
      })}
    </div>
  );
}

function Step1BusinessType({
  packs,
  loading,
  selected,
  onSelect,
}: {
  packs: PackSummary[];
  loading: boolean;
  selected: PackSummary | null;
  onSelect: (p: PackSummary) => void;
}) {
  if (loading) return <div style={{ color: MUTED, textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
        What kind of business do you run?
      </h2>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
        We&apos;ll pre-fill services, AI receptionist tone, and pricing based on your choice. You can change anything later.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {packs.map((p) => {
          const isSelected = selected?.slug === p.slug;
          return (
            <button
              key={p.slug}
              onClick={() => onSelect(p)}
              style={{
                textAlign: "left",
                background: isSelected ? `${ACCENT}15` : INPUT_BG,
                border: isSelected ? `1.5px solid ${ACCENT}` : INPUT_BORDER,
                borderRadius: 12,
                padding: 16,
                color: TEXT,
                cursor: "pointer",
                width: "100%",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{p.displayName}</div>
              <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>{p.pitch.headline}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: TEXT }}>
                <span>
                  <strong>€{p.pricing.base}</strong>/mo + €{p.pricing.perUnit}/{p.pricing.unitLabel}
                </span>
                <span style={{ color: MUTED }}>·</span>
                <span style={{ color: MUTED }}>
                  {p.pricing.includedAiCallsPerMonth} AI calls included
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2BasicsAndSlug({
  shopName,
  setShopName,
  city,
  setCity,
  slug,
  setSlug,
  slugStatus,
  pickSuggestion,
  pack,
}: {
  shopName: string;
  setShopName: (s: string) => void;
  city: string;
  setCity: (s: string) => void;
  slug: string;
  setSlug: (s: string) => void;
  slugStatus: { state: string; reason?: string; suggestions?: string[] };
  pickSuggestion: (s: string) => void;
  pack: PackSummary;
}) {
  const statusColor =
    slugStatus.state === "available"
      ? SUCCESS_COLOR
      : slugStatus.state === "unavailable"
      ? ERROR_COLOR
      : MUTED;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
        Tell us about your {pack.displayName.toLowerCase()}
      </h2>

      <Field label="Shop name">
        <input
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder={pack.slug === "MECHANIC" ? "Auto Servis Petrović" : pack.slug === "BARBER" ? "Frizerski Salon Marko" : "Stomatološka Ordinacija Dr. Horvat"}
          style={inputStyle}
        />
      </Field>

      <Field label="City (optional)">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Zagreb"
          style={inputStyle}
        />
      </Field>

      <Field label="Your booking page URL">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ color: MUTED, fontSize: 13 }}>queueup.me/booking/</div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="auto-servis-petrovic"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        {slug && slug.length >= 3 && (
          <div style={{ fontSize: 12, marginTop: 6, color: statusColor }}>
            {slugStatus.state === "checking" && "Checking..."}
            {slugStatus.state === "available" && "✓ Available"}
            {slugStatus.state === "unavailable" && `✗ ${slugStatus.reason ?? "Unavailable"}`}
          </div>
        )}
        {slugStatus.state === "unavailable" && slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: MUTED }}>
            Try:{" "}
            {slugStatus.suggestions.map((s, i) => (
              <span key={s}>
                <button
                  onClick={() => pickSuggestion(s)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: ACCENT,
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 12,
                  }}
                >
                  {s}
                </button>
                {i < slugStatus.suggestions!.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </Field>
    </div>
  );
}

function Step3Services({
  services,
  addService,
  removeService,
  updateService,
  resetDefaults,
  pack,
}: {
  services: ServiceRow[];
  addService: () => void;
  removeService: (id: string) => void;
  updateService: (id: string, patch: Partial<ServiceRow>) => void;
  resetDefaults: () => void;
  pack: PackSummary;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Your {pack.labels.serviceLabelPlural.toLowerCase()}
      </h2>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>
        We pre-filled common {pack.displayName.toLowerCase()} {pack.labels.serviceLabelPlural.toLowerCase()}. Adjust prices to match your shop, delete what doesn&apos;t apply, add custom ones.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {services.map((s) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 36px",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              value={s.name}
              onChange={(e) => updateService(s.id, { name: e.target.value })}
              placeholder="Service name"
              style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
            />
            <input
              type="number"
              value={s.duration}
              onChange={(e) => updateService(s.id, { duration: parseInt(e.target.value) || 0 })}
              placeholder="min"
              style={{ ...inputStyle, padding: "8px 10px", fontSize: 13, textAlign: "right" }}
            />
            <input
              type="number"
              value={s.price}
              onChange={(e) => updateService(s.id, { price: parseFloat(e.target.value) || 0 })}
              placeholder="€"
              step="0.5"
              style={{ ...inputStyle, padding: "8px 10px", fontSize: 13, textAlign: "right" }}
            />
            <button
              onClick={() => removeService(s.id)}
              style={{
                background: "transparent",
                border: INPUT_BORDER,
                borderRadius: 8,
                color: MUTED,
                cursor: "pointer",
                fontSize: 16,
                padding: "6px 0",
              }}
              aria-label="Delete service"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={addService}
          style={{
            background: INPUT_BG,
            border: INPUT_BORDER,
            borderRadius: 10,
            padding: "8px 14px",
            color: TEXT,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Add service
        </button>
        <button
          onClick={resetDefaults}
          style={{
            background: "transparent",
            border: INPUT_BORDER,
            borderRadius: 10,
            padding: "8px 14px",
            color: MUTED,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Reset to defaults
        </button>
      </div>

      {services.length === 0 && (
        <div style={{ marginTop: 16, fontSize: 12, color: ERROR_COLOR }}>
          Add at least one service to continue.
        </div>
      )}
    </div>
  );
}

function Step4Hours({
  hours,
  updateHours,
  pack,
}: {
  hours: HoursRow[];
  updateHours: (idx: number, patch: Partial<HoursRow>) => void;
  pack: PackSummary;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Working hours
      </h2>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>
        Pre-filled with typical {pack.displayName.toLowerCase()} hours. Adjust per day or skip and set up later in your dashboard.
      </p>

      <div style={{ display: "grid", gap: 6 }}>
        {hours.map((h, i) => (
          <div
            key={h.day}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 80px 1fr 80px",
              gap: 10,
              alignItems: "center",
              opacity: h.isClosed ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 13, color: TEXT }}>{DAY_LABEL[h.day]}</div>
            <label style={{ fontSize: 12, color: MUTED, display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={!h.isClosed}
                onChange={(e) => updateHours(i, { isClosed: !e.target.checked })}
              />
              Open
            </label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="time"
                value={h.openTime}
                disabled={h.isClosed}
                onChange={(e) => updateHours(i, { openTime: e.target.value })}
                style={{ ...inputStyle, padding: "6px 8px", fontSize: 13, flex: 1 }}
              />
              <span style={{ color: MUTED, fontSize: 12 }}>to</span>
              <input
                type="time"
                value={h.closeTime}
                disabled={h.isClosed}
                onChange={(e) => updateHours(i, { closeTime: e.target.value })}
                style={{ ...inputStyle, padding: "6px 8px", fontSize: 13, flex: 1 }}
              />
            </div>
            <div style={{ color: MUTED, fontSize: 12, textAlign: "right" }}>
              {h.isClosed ? "Closed" : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step5Review({
  shopName,
  city,
  slug,
  services,
  hours,
  pack,
}: {
  shopName: string;
  city: string;
  slug: string;
  services: ServiceRow[];
  hours: HoursRow[];
  pack: PackSummary;
}) {
  const monthly = pack.pricing.base + pack.pricing.perUnit;
  const openDays = hours.filter((h) => !h.isClosed).length;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Ready to launch?
      </h2>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>
        Review and create your shop. 30-day free trial — no card required.
      </p>

      <div style={{ display: "grid", gap: 14, fontSize: 13 }}>
        <ReviewRow label="Business type" value={pack.displayName} />
        <ReviewRow label="Shop name" value={shopName} />
        {city && <ReviewRow label="City" value={city} />}
        <ReviewRow label="Booking URL" value={`queueup.me/booking/${slug}`} accent />
        <ReviewRow label={pack.labels.serviceLabelPlural} value={`${services.length} service${services.length === 1 ? "" : "s"}`} />
        <ReviewRow label="Open days" value={`${openDays} of 7`} />
        <ReviewRow
          label="Pricing"
          value={`€${monthly}/mo trial • ${pack.pricing.includedAiCallsPerMonth} AI calls included • €${pack.pricing.overageRateEur}/call overage`}
        />
      </div>
    </div>
  );
}

function ReviewRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #ffffff08", paddingBottom: 10 }}>
      <div style={{ color: MUTED }}>{label}</div>
      <div style={{ color: accent ? ACCENT : TEXT, fontWeight: accent ? 600 : 400, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, color: MUTED, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: INPUT_BORDER,
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 14,
  color: TEXT,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};
