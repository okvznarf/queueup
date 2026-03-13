import AdminClient from "./AdminClient";

type PageProps = { params: Promise<{ slug: string }> };

export default async function AppointmentsPage({ params }: PageProps) {
  const { slug } = await params;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(baseUrl + "/api/shops?slug=" + slug, { cache: "no-store" });
  if (!res.ok) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff" }}><h1>Shop not found</h1></div>;
  }
  const shop = await res.json();
  return <AdminClient shop={shop} />;
}