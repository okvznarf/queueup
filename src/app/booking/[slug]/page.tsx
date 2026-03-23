import BookingClient from "./BookingClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookingPage({ params }: PageProps) {
  const { slug } = await params;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(baseUrl + "/api/shops?slug=" + slug, { cache: "no-store" });

  if (!res.ok) {
    const isUnavailable = res.status === 403;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 48, margin: 0 }}>{isUnavailable ? "Unavailable" : "404"}</h1>
          <p style={{ color: "#888" }}>{isUnavailable ? "This business is currently unavailable" : "Business not found"}</p>
        </div>
      </div>
    );
  }

  const shop = await res.json();
  return <BookingClient shop={shop} />;
}