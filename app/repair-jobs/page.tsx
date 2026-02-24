"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Map, { Marker, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { supabase } from "@/lib/supabaseClient";

type NearbyRequest = {
  id: string;
  title: string | null;
  description: string | null;
  zip: string | null;
  created_at: string | null;

  distance_mile?: number | null;
  distance_miles?: number | null;

  // ✅ public/masked coords
  public_lat?: number | null;
  public_lng?: number | null;
};

export default function RepairJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [walletUsd, setWalletUsd] = useState("0.00");

  const [zipInput, setZipInput] = useState("19115");
  const [radiusMiles, setRadiusMiles] = useState(10);

  const [jobs, setJobs] = useState<NearbyRequest[]>([]);
  const [filterMode, setFilterMode] = useState<"zip" | "gps">("zip");

  // mobil list/map
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");

  // seçilmiş job
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) || null,
    [jobs, selectedId]
  );

  const radiusLabel = useMemo(() => `${radiusMiles} mile`, [radiusMiles]);

  // token (NEXT_PUBLIC_* clientdə oxunur)
  const mapboxToken = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();
  console.log("MAP TOKEN:", process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  // Map view
  const [viewState, setViewState] = useState({
    latitude: 39.9526,
    longitude: -75.1652,
    zoom: 11,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setMessage("");

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
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

  function setMapToFirstJob(rows: NearbyRequest[]) {
    const first = rows.find((r) => r.public_lat != null && r.public_lng != null);
    if (!first) return;

    setViewState((v) => ({
      ...v,
      latitude: Number(first.public_lat),
      longitude: Number(first.public_lng),
      zoom: 12,
    }));
  }

  function focusJobOnMap(job: NearbyRequest) {
    if (job.public_lat == null || job.public_lng == null) return;

    setSelectedId(job.id);
    setMobileTab("map"); // mobil-də xəritəyə keçsin
    setViewState((v) => ({
      ...v,
      latitude: Number(job.public_lat),
      longitude: Number(job.public_lng),
      zoom: Math.max(v.zoom, 12),
    }));
  }

  async function fetchNearbyByZip() {
    setLoading(true);
    setMessage("");

    try {
      const zip = zipInput.trim();
      if (!zip) {
        setMessage("Please enter a ZIP code.");
        setJobs([]);
        return;
      }

      // ZIP -> lat/lng
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

      // ✅ public coords qaytaran RPC
      const { data, error } = await supabase.rpc("get_nearby_requests_public", {
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
      setSelectedId(null);
      setMapToFirstJob(rows);
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

      const { data, error } = await supabase.rpc("get_nearby_requests_public", {
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
      setSelectedId(null);
      setMapToFirstJob(rows);
    } catch {
      setMessage(
        "Could not get your location. Please allow location access or use ZIP."
      );
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

  const markers = useMemo(
    () => jobs.filter((j) => j.public_lat != null && j.public_lng != null),
    [jobs]
  );

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
            <button type="button" style={btn}>
              Dashboard
            </button>
          </Link>
          <button type="button" onClick={handleLogout} style={btn}>
            Logout
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div style={filterCard}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
          Find jobs near you
        </div>

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
            <span style={{ marginLeft: 8, fontWeight: 800 }}>
              Use my location
            </span>
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
          <select
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            style={select}
          >
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={15}>15 miles</option>
            <option value={25}>25 miles</option>
          </select>
          <div style={{ color: "#666", fontSize: 13 }}>
            Showing jobs within {radiusLabel}
          </div>
        </div>

        <button
          type="button"
          onClick={handleBrowse}
          style={btnPrimary}
          disabled={loading}
        >
          {loading ? "Loading…" : "Search jobs"}
        </button>

        {message && <div style={notice}>{message}</div>}

        {/* mobil toggle */}
        <div className="mobileTabs" style={mobileTabs}>
          <button
            type="button"
            style={mobileTab === "list" ? tabBtnActive : tabBtn}
            onClick={() => setMobileTab("list")}
          >
            List
          </button>
          <button
            type="button"
            style={mobileTab === "map" ? tabBtnActive : tabBtn}
            onClick={() => setMobileTab("map")}
          >
            Map
          </button>
        </div>
      </div>

      {/* SPLIT */}
      <div style={splitWrap}>
        {/* LEFT LIST */}
        <div
          className={`${mobileTab === "map" ? "hideOnMobile" : ""}`}
          style={leftPane}
        >
          {loading ? (
            <div style={{ color: "#666" }}>Loading…</div>
          ) : jobs.length === 0 ? (
            <div style={{ color: "#666", fontSize: 18 }}>
              No jobs found for this area.
            </div>
          ) : (
            <div style={jobList}>
              {jobs.map((j) => {
                const dist = j.distance_miles ?? j.distance_mile ?? null;

                return (
                  <div
                    key={j.id}
                    style={selectedId === j.id ? jobCardSelected : jobCard}
                    onClick={() => focusJobOnMap(j)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={jobTitle}>{j.title || "Untitled job"}</div>
                        <div style={jobMeta}>
                          {j.created_at
                            ? `Posted: ${new Date(j.created_at).toLocaleString(
                                "en-US"
                              )}`
                            : "Posted: —"}
                          {"  •  "}
                          {dist != null ? `${Number(dist).toFixed(1)} mi` : "— mi"}
                          {"  •  "}
                          ZIP: {j.zip || "—"}
                        </div>
                      </div>

                      <button
                        type="button"
                        style={offerBtn}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Make offer ($1)
                      </button>
                    </div>

                    <div style={jobDesc}>{j.description || "—"}</div>
                    <div style={jobId}>Request ID: {j.id}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT MAP */}
        <div
          className={`${mobileTab === "list" ? "hideOnMobile" : ""}`}
          style={rightPane}
        >
          <div style={mapCard}>
            {!mapboxToken || !mapboxToken.startsWith("pk.") ? (
              <div style={{ padding: 14, color: "#b00020", fontWeight: 900 }}>
                Mapbox token missing/invalid. Set{" "}
                <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> (must start with{" "}
                <code>pk.</code>)
              </div>
            ) : (
              <Map
                mapboxAccessToken={mapboxToken}
                latitude={viewState.latitude}
                longitude={viewState.longitude}
                zoom={viewState.zoom}
                onMove={(evt) =>
                  setViewState({
                    latitude: evt.viewState.latitude,
                    longitude: evt.viewState.longitude,
                    zoom: evt.viewState.zoom,
                  })
                }
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: "100%", height: "100%" }}
              >
                {markers.map((j) => (
                  <Marker
                    key={j.id}
                    longitude={Number(j.public_lng)}
                    latitude={Number(j.public_lat)}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedId(j.id);
                    }}
                  >
                    <div style={pinDot} />
                  </Marker>
                ))}

                {selected &&
                  selected.public_lat != null &&
                  selected.public_lng != null && (
                    <Popup
                      longitude={Number(selected.public_lng)}
                      latitude={Number(selected.public_lat)}
                      closeOnClick={false}
                      onClose={() => setSelectedId(null)}
                      anchor="top"
                    >
                      <div style={{ fontSize: 13, maxWidth: 220 }}>
                        <div style={{ fontWeight: 900 }}>
                          {selected.title || "Untitled job"}
                        </div>
                        <div style={{ opacity: 0.75, marginTop: 4 }}>
                          ZIP: {selected.zip || "—"} •{" "}
                          {(selected.distance_miles ?? selected.distance_mile) !=
                          null
                            ? `${Number(
                                selected.distance_miles ?? selected.distance_mile
                              ).toFixed(1)} mi`
                            : "— mi"}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {selected.description ? selected.description : "—"}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                          Exact address is hidden until accepted.
                        </div>
                      </div>
                    </Popup>
                  )}
              </Map>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .filtersRow {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .hideOnMobile {
            display: none !important;
          }
        }
        @media (min-width: 901px) {
          .mobileTabs {
            display: none !important;
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

const mobileTabs: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  gap: 10,
};

const tabBtn: React.CSSProperties = {
  padding: "10px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  width: 110,
};

const tabBtnActive: React.CSSProperties = {
  ...tabBtn,
  background: "#000",
  color: "#fff",
};

const splitWrap: React.CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "1.15fr 0.85fr",
  gap: 16,
  alignItems: "start",
};

const leftPane: React.CSSProperties = {
  minWidth: 0,
};

const rightPane: React.CSSProperties = {
  position: "sticky",
  top: 130,
};

const mapCard: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  height: 560,
  overflow: "hidden",
};

const jobList: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const jobCard: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 16,
  cursor: "pointer",
};

const jobCardSelected: React.CSSProperties = {
  ...jobCard,
  outline: "2px solid #000",
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

const pinDot: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  border: "2px solid #000",
  background: "#fff",
};