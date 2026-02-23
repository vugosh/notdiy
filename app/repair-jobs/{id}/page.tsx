"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  description: string;
  zip: string;
  created_at: string | null;
  distance_mile?: number | null;
};

function parseRadiusMiles(value: string | number) {
  if (typeof value === "number") return value;
  // value məsələn: "10 miles" və ya "10"
  const n = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 10;
}

export default function RepairJobsPage() {
  const [useZip, setUseZip] = useState(true);
  const [zip, setZip] = useState("19115");
  const [radius, setRadius] = useState<string>("10 miles");

  const radiusMiles = useMemo(() => parseRadiusMiles(radius), [radius]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // səhifə açılanda avtomatik də 1 dəfə axtarsın
  useEffect(() => {
    // istəsən bunu silə bilərsən, amma yaxşıdır (page boş qalmasın)
    doSearchByZip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearchByZip() {
    setLoading(true);
    setStatusMsg("");

    try {
      const cleanZip = zip.trim();

      console.log("=== SEARCH START ===");
      console.log("useZip:", useZip);
      console.log("zip:", cleanZip);
      console.log("radius raw:", radius, "-> miles:", radiusMiles);

      if (!cleanZip) {
        setJobs([]);
        setStatusMsg("Please enter a ZIP code.");
        return;
      }

      // 1) ZIP -> lat/lng
      const geoRes = await fetch(`/api/geocode?zip=${encodeURIComponent(cleanZip)}`, {
        cache: "no-store",
      });

      const geo = await geoRes.json();
      console.log("GEO:", geo);

      if (!geo?.lat || !geo?.lng) {
        setJobs([]);
        setStatusMsg("ZIP not found. Try another ZIP.");
        return;
      }

      // 2) RPC -> nearby requests
      const { data, error } = await supabase.rpc("get_nearby_requests", {
        p_lat: Number(geo.lat),
        p_lng: Number(geo.lng),
        p_radius_miles: Number(radiusMiles),
        p_limit: 50,
      });

      console.log("RPC ERROR:", error);
      console.log("RPC DATA:", data);

      if (error) {
        setJobs([]);
        setStatusMsg(`RPC error: ${error.message}`);
        return;
      }

      const rows = (Array.isArray(data) ? data : []) as Job[];
      setJobs(rows);

      if (rows.length === 0) {
        setStatusMsg(`No jobs found within ${radiusMiles} miles.`);
      } else {
        setStatusMsg(`Showing ${rows.length} jobs within ${radiusMiles} miles.`);
      }
    } catch (e: any) {
      console.error("SEARCH FAILED:", e);
      setJobs([]);
      setStatusMsg("Unexpected error. Check console.");
    } finally {
      setLoading(false);
      console.log("=== SEARCH END ===");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ fontSize: 64, margin: 0 }}>Available Jobs</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/dashboard"
            style={{
              border: "2px solid #111",
              padding: "10px 16px",
              textDecoration: "none",
              color: "#111",
              fontWeight: 700,
              borderRadius: 6,
            }}
          >
            Dashboard
          </Link>

          <button
            style={{
              border: "2px solid #111",
              padding: "10px 16px",
              background: "white",
              color: "#111",
              fontWeight: 700,
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => alert("Logout handler here")}
          >
            Logout
          </button>
        </div>
      </div>

      <p style={{ marginTop: 12, color: "#333", fontSize: 18 }}>
        Browse posted repair requests and send an offer.
        <br />
        Each offer costs <b>$1</b> from your wallet.
      </p>

      <p style={{ marginTop: 10, fontSize: 20 }}>
        Wallet balance: <b>$10.00</b> <span style={{ color: "#777" }}>(Top-up page coming soon)</span>
      </p>

      {/* Search box */}
      <div style={{ marginTop: 18, border: "1px solid #e5e5e5", padding: 18, borderRadius: 8 }}>
        <h2 style={{ margin: 0 }}>Find jobs near you</h2>

        <div style={{ display: "flex", gap: 18, marginTop: 10, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              checked={useZip}
              onChange={() => setUseZip(true)}
            />
            Use ZIP
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              checked={!useZip}
              onChange={() => setUseZip(false)}
            />
            Use my location
          </label>
        </div>

        {/* ZIP input */}
        <div style={{ marginTop: 10 }}>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP code"
            style={{ width: 280, padding: "12px 14px", border: "2px solid #111", fontSize: 16 }}
            disabled={!useZip}
          />
        </div>

        {/* Radius */}
        <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Radius</div>

          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            style={{ padding: "10px 12px", border: "2px solid #111", fontSize: 16 }}
          >
            <option>5 miles</option>
            <option>10 miles</option>
            <option>15 miles</option>
            <option>20 miles</option>
            <option>30 miles</option>
          </select>

          <div style={{ color: "#666" }}>Showing jobs within {radiusMiles} mile</div>
        </div>

        {/* Search button */}
        <button
          onClick={doSearchByZip}
          disabled={loading}
          style={{
            marginTop: 14,
            width: 280,
            padding: "12px 14px",
            border: "2px solid #111",
            background: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Search"}
        </button>

        {statusMsg ? (
          <p style={{ marginTop: 10, color: "#444" }}>{statusMsg}</p>
        ) : null}
      </div>

      {/* Results */}
      <div style={{ marginTop: 18 }}>
        {loading ? <p>Loading...</p> : null}

        {!loading && jobs.length > 0 ? (
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/repair-jobs/${job.id}`}
                style={{
                  border: "1px solid #eee",
                  padding: 14,
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "#111",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{job.title}</div>
                  <div style={{ color: "#666" }}>
                    {job.distance_mile != null ? `${Number(job.distance_mile).toFixed(2)} mi` : ""}
                  </div>
                </div>

                <div style={{ marginTop: 6, color: "#333" }}>{job.description}</div>
                <div style={{ marginTop: 8, color: "#777", fontSize: 14 }}>
                  ZIP: {job.zip}
                  {job.created_at ? ` • ${new Date(job.created_at).toLocaleString()}` : ""}
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}