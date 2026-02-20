"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";


type RequestRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  title: string | null;
  description: string | null;
  media_urls: string[] | null;
  status: string | null;
  tracking_number: string | null;
  created_at: string | null;
};

export default function TrackPage() {
  const [email, setEmail] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<RequestRow | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setResult(null);

    const cleanEmail = email.trim();
    const cleanTracking = trackingNumber.trim();

    if (!cleanEmail || !cleanTracking) {
      setErrorMsg("Please enter both email and tracking number.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc("get_request_by_tracking", {
      p_tracking_number: cleanTracking,
      p_email: cleanEmail,
    });

    if (error) {
      console.error("Track RPC error:", error);
      setErrorMsg("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMsg("No request found for this email + tracking number.");
      setLoading(false);
      return;
    }

    setResult(data as RequestRow);
    setLoading(false);
  }

  return (
    <main
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        minHeight: "100vh",
        padding: "120px 24px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 44, marginBottom: 10 }}>Track your request</h1>
        <p style={{ color: "#555", marginTop: 0, marginBottom: 24 }}>
          Enter your email and tracking number to view your repair request status and updates.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 520,
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              style={{
                padding: "12px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Tracking number</span>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 537499"
              style={{
                padding: "12px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: "14px 16px",
              borderRadius: 8,
              border: "none",
              background: "#000",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Checking..." : "Track"}
          </button>

          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.4 }}>
            <div>Your tracking number was emailed to you.</div>
            <div>Keep it secure.</div>
            <div>Use it to check status and view handyman offers.</div>
          </div>

          {errorMsg ? (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 8,
                background: "#fff3f3",
                border: "1px solid #ffd0d0",
                color: "#a40000",
              }}
            >
              {errorMsg}
            </div>
          ) : null}
        </form>

        {result ? (
          <div
            style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 12,
              border: "1px solid #eee",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Your request</h2>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #000",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Status: {result.status ?? "unknown"}
              </span>
              <span style={{ color: "#666", fontSize: 13 }}>
                Tracking: <strong>{result.tracking_number}</strong>
              </span>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Title</div>
                <div>{result.title ?? "-"}</div>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Description</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{result.description ?? "-"}</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Media</div>
                {result.media_urls?.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {result.media_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#000", textDecoration: "underline" }}
                      >
                        Open file {idx + 1}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "#666" }}>No media uploaded.</div>
                )}
              </div>
            </div>

            {/* burda gələcəkdə "offers" hissəsini əlavə edəcəyik */}
          </div>
        ) : null}
      </div>
    </main>
  );
}
