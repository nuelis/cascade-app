"use client";

import { useEffect, useState } from "react";

type Vendor = {
  id: string;
  name: string;
  access_scope: string | null;
  status: "clear" | "needs_review" | "expiring" | "expired";
  expiry_date: string | null;
};

// TODO: replace with the real logged-in company's id once auth is wired up
const DEMO_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

export default function Dashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadVendors() {
    setLoading(true);
    const res = await fetch(`/api/vendors?companyId=${DEMO_COMPANY_ID}`);
    const data = await res.json();
    setVendors(data.vendors || []);
    setLoading(false);
  }

  useEffect(() => {
    loadVendors();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !vendorName) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("vendorName", vendorName);
    formData.append("companyId", DEMO_COMPANY_ID);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await res.json();

    if (result.needsManualReview) {
      alert(
        `Uploaded, but couldn't auto-read the expiry date for ${vendorName}. Open the vendor to set it manually.`
      );
    }

    setVendorName("");
    setFile(null);
    setUploading(false);
    loadVendors();
  }

  const statusColor: Record<string, string> = {
    clear: "#1C3833",
    expiring: "#4A3A1E",
    expired: "rgba(229,83,60,0.15)",
    needs_review: "#232A32",
  };
  const statusText: Record<string, string> = {
    clear: "#4CC9B0",
    expiring: "#F0A83C",
    expired: "#E5533C",
    needs_review: "#8792A0",
  };
  const statusLabel: Record<string, string> = {
    clear: "Active",
    expiring: "Expiring soon",
    expired: "EXPIRED",
    needs_review: "Needs review",
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Vendor Insurance Tracker</h1>
      <p style={{ color: "#666", marginBottom: 28, fontSize: 14 }}>
        Upload a vendor's certificate of insurance — we'll track the expiry and alert you before it lapses.
      </p>

      <form
        onSubmit={handleUpload}
        style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}
      >
        <input
          type="text"
          placeholder="Vendor name"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          required
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6, flex: "1 1 200px" }}
        />
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: "8px 16px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {uploading ? "Reading certificate..." : "Upload & track"}
        </button>
      </form>

      {loading ? (
        <p>Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <p style={{ color: "#888" }}>No vendors tracked yet. Upload your first certificate above.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "8px 4px" }}>Vendor</th>
              <th style={{ padding: "8px 4px" }}>Expires</th>
              <th style={{ padding: "8px 4px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 4px" }}>{v.name}</td>
                <td style={{ padding: "10px 4px" }}>{v.expiry_date || "—"}</td>
                <td style={{ padding: "10px 4px" }}>
                  <span
                    style={{
                      background: statusColor[v.status],
                      color: statusText[v.status],
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {statusLabel[v.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
