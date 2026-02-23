"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type NearbyRequest = {
  id: string;
  title: string | null;
  description: string | null;
  zip: string | null;
  created_at: string | null;

  // DB/RPC bəzən distance_mile qaytarır, bəzən distance_miles — ikisini də tuturuq
  distance_mile?: number | null;
  distance_miles?: number | null;
};

export default function RepairJobsPage() {
  const router = useRouter();

  // ⚠️ əvvəl true idi və page açılan kimi Loading-da qalırdı
  // Daha doğru: default false
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [walletUsd, setWalletUsd] = useState("0.00");

  const [zipInput, setZipInput] = useState("19115");
  const [radiusMiles, setRadiusMiles] = useState(10);

  const [jobs, setJobs] = useState<NearbyRequest[]>([]);
  const [filterMode, setFilterMode] = useState<"zip" | "gps">("zip");

  const radiusLabel = useMemo(() => `${radiusMiles} mile`, [radiusMiles]);

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setMessage("");

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        if (isMounted) setMessage(sessionErr.message);
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        router.push("/handyman/login");
        return;
      }

      const { data: walletRow, error: walletErr } = await supabase
        .from("handyman_wallets")
        .select("balance_cents")
        .eq("handyman_id", user.id)
        .single();

      if (walletErr) {
        if (isMounted) setMessage(walletErr.message);
      } else {
        const balanceCents = walletRow?.balance_cents ?? 0;
        const usd = (balanceCents / 100).toFixed(2);
        if (isMounted) setWalletUsd(usd);
      }
    }

    loadWallet();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function fetchNearbyByZip() {
    setLoading(true);
    setMessage("");

    try {
      const zip = zipInput.trim();
      if (!zip) {
        setMessage("Please enter a ZIP code.");
        return;
      }

      // ✅ DÜZ: endpoint zip param gözləyir
      const geoResp = await fetch(
        `/api/geocode?q=${encodeURIComponent(zip)}&zip=${encodeURIComponent(zip)}`,
        { cache: "no-store" }
      );
      const geoJson = await geoResp.json();

      if (!geoResp.ok) {
        setMessage(geoJson?.error || "Geocode failed.");
        setJobs([]);
        return;
      }

      const { lat, lng } = geoJson as { lat: number; lng: number };

      const { data, error } = await supabase.rpc("get_nearby_requests", {
        p_lat: lat,
        p_lng: lng,
        p_radius_miles: radiusMiles,
        p_limit: 50,
      });

      if (error) {
        setMessage(error.message);
        setJobs([]);
        return;
      }

      const rows = (Array.isArray(data) ? data : []) as NearbyRequest[];
      setJobs(rows);
    } catch (e: any) {
      setMessage(e?.message || "Something went wrong.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNearbyByGPS() {
    setLoading(true);
    setMessage("");

    try {
      if (!navigator.geolocation) {
        setMessage("Geolocation is not supported in this browser.");
        setJobs([]);
        return;
      }

      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const { data, error } = await supabase.rpc("get_nearby_requests", {
        p_lat: lat,
        p_lng: lng,
        p_radius_miles: radiusMiles,
        p_limit: 50,
      });

      if (error) {
        setMessage(error.message);
        setJobs([]);
        return;
      }

      const rows = (Array.isArray(data) ? data : []) as NearbyRequest[];
      setJobs(rows);
    } catch {
      setMessage("Could not get your location. Please allow location access or use ZIP.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleBrowse() {
    if (filterMode === "gps") await fetchNearbyByGPS();
    else await fetchNearbyByZip();
  }

  async function handleLogout() {
    setMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/handyman/login");
  }

  return (
    <div style={pageWrap}>
      <div style={topBar}>
        <div>
          <h1 style={h1}>Available Jobs</h1>
          <p style={sub}>
            Browse posted repair requests and send an offer. <br />
            Each offer costs <b>$1</b> from your wallet.
          </p>

          <div style={{ marginTop: 10, fontSize: 18 }}>
            Wallet balance: <b>${walletUsd}</b>{" "}
            <span style={{ color: "#777" }}>(Top-up page coming soon)</span>
          </div>
        </div>

        <div style={topBtns}>
          <Link href="/handyman/dashboard" style={{ textDecoration: "none" }}>
            <button style={btn}>Dashboard</button>
          </Link>
          <button onClick={handleLogout} style={btn}>
            Logout
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div style={filterCard}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Find jobs near you</div>

        <div className="filtersRow" style={filtersRow}>
          <label style={radioRow}>
            <input
              type="radio"
              name="mode"
              checked={filterMode === "zip"}
              onChange={() => setFilterMode("zip")}
            />
            <span style={{ marginLeft: 8, fontWeight: 800 }}>Use ZIP</span>
          </label>

          <label style={radioRow}>
            <input
              type="radio"
              name="mode"
              checked={filterMode === "gps"}
              onChange={() => setFilterMode("gps")}
            />
            <span style={{ marginLeft: 8, fontWeight: 800 }}>Use my location</span>
          </label>
        </div>

        {filterMode === "zip" && (
          <div className="zipRow" style={zipRow}>
            <input
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              placeholder="ZIP (e.g. 19115)"
              style={input}
            />
          </div>
        )}

        <div className="radiusRow" style={radiusRow}>
          <div style={{ fontWeight: 800 }}>Radius</div>
          <select value={radiusMiles} onChange={(e) => setRadiusMiles(Number(e.target.value))} style={select}>
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={15}>15 miles</option>
            <option value={25}>25 miles</option>
          </select>
          <div style={{ color: "#666", fontSize: 13 }}>Showing jobs within {radiusLabel}</div>
        </div>

        <button onClick={handleBrowse} style={btnPrimary} disabled={loading}>
          {loading ? "Loading…" : "Search jobs"}
        </button>

        {message && <div style={notice}>{message}</div>}
      </div>

      {/* LIST */}
      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ color: "#666" }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div style={{ color: "#666", fontSize: 18 }}>No jobs found for this area.</div>
        ) : (
          <div style={jobList}>
            {jobs.map((j) => {
              const dist =
                j.distance_miles ?? j.distance_mile ?? null;

              return (
                <div key={j.id} style={jobCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={jobTitle}>{j.title || "Untitled job"}</div>
                      <div style={jobMeta}>
                        {j.created_at
                          ? `Posted: ${new Date(j.created_at).toLocaleString("en-US")}`
                          : "Posted: —"}
                        {"  •  "}
                        {dist != null ? `${Number(dist).toFixed(1)} mi` : "— mi"}
                        {"  •  "}
                        ZIP: {j.zip || "—"}
                      </div>
                    </div>

                    <button style={offerBtn}>Make offer ($1)</button>
                  </div>

                  <div style={jobDesc}>{j.description || "—"}</div>
                  <div style={jobId}>Request ID: {j.id}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .filtersRow {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- Styles ---------- */

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "28px 24px 40px",
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
};

const topBtns: React.CSSProperties = {
  display: "flex",
  gap: 12,
};

const h1: React.CSSProperties = { margin: 0, fontSize: 56, letterSpacing: "-0.5px" };

const sub: React.CSSProperties = { margin: "6px 0 0", fontSize: 18, color: "#444" };

const btn: React.CSSProperties = {
  padding: "10px 18px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const filterCard: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 16,
};

const filtersRow: React.CSSProperties = {
  display: "flex",
  gap: 18,
  alignItems: "center",
};

const radioRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const zipRow: React.CSSProperties = {
  marginTop: 10,
};

const radiusRow: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "auto 160px 1fr",
  gap: 12,
  alignItems: "center",
};

const input: React.CSSProperties = {
  width: 260,
  maxWidth: "100%",
  padding: "12px 12px",
  border: "2px solid #000",
  fontWeight: 800,
  outline: "none",
};

const select: React.CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  border: "2px solid #000",
  fontWeight: 800,
  background: "#fff",
};

const btnPrimary: React.CSSProperties = {
  marginTop: 12,
  width: 220,
  padding: "12px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const notice: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
};

const jobList: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const jobCard: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 16,
};

const jobTitle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 6,
  wordBreak: "break-word",
};

const jobMeta: React.CSSProperties = {
  color: "#666",
  fontSize: 14,
  marginBottom: 10,
};

const jobDesc: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginTop: 6,
};

const jobId: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: "#777",
};

const offerBtn: React.CSSProperties = {
  padding: "10px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
};