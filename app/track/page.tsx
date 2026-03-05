"use client";

import { useMemo, useState } from "react";
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
  job_status: string | null;

  tracking_number: string | null;
  created_at: string | null;
};

type OfferRow = {
  offer_id: string;
  message: string | null;
  price_cents: number | null;
  status: string | null;
  created_at: string | null;
};

function norm(v: string | null | undefined) {
  return (v || "").toLowerCase().trim();
}

function firstRow<T>(data: any): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === "object") return data as T;
  return null;
}

function money(cents: number | null | undefined) {
  const n = Number(cents ?? 0);
  return `$${(n / 100).toFixed(2)}`;
}

function jobStatusLabel(v: string | null | undefined) {
  const s = norm(v);
  if (!s) return "—";
  if (s === "awaiting_offers") return "Waiting for offers";
  if (s === "in_progress") return "In progress";
  if (s === "waiting_customer_confirmation") return "Waiting for your confirmation";
  if (s === "completed") return "Successfully completed";
  if (s === "dispute") return "Problem reported";
  return s;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US");
}

// ---- NEW: try direct SELECT first (if RLS allows), else fallback to RPC ----
async function getRequestByEmailTracking(p_email: string, p_tracking_number: string) {
  // 1) Try direct table select (fast + returns all fields)
  const direct = await supabase
    .from("requests")
    .select(
      "id,first_name,last_name,email,phone,address,zip,title,description,media_urls,status,job_status,tracking_number,created_at"
    )
    .eq("email", p_email)
    .eq("tracking_number", p_tracking_number)
    .maybeSingle();

  if (!direct.error && direct.data) {
    return { row: direct.data as RequestRow, source: "direct" as const };
  }

  // 2) Fallback to RPC (your existing secure path)
  const rpc = await supabase.rpc("get_request_by_tracking", {
    p_tracking_number,
    p_email,
  });

  if (rpc.error) {
    // return the direct error first if useful, otherwise rpc error
    const msg = rpc.error?.message || direct.error?.message || "Unknown error";
    return { row: null as RequestRow | null, error: msg, source: "rpc" as const };
  }

  const row = firstRow<RequestRow>(rpc.data);
  return { row, source: "rpc" as const };
}

export default function TrackPage() {
  const [email, setEmail] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const [result, setResult] = useState<RequestRow | null>(null);

  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const cleanTracking = useMemo(() => trackingNumber.trim(), [trackingNumber]);

  const acceptedOfferExists = useMemo(
    () => offers.some((o) => norm(o.status) === "accepted"),
    [offers]
  );

  const jobStatus = norm(result?.job_status);
  const showConfirmBlock = jobStatus === "waiting_customer_confirmation";
  const showCompleted = jobStatus === "completed";
  const showDispute = jobStatus === "dispute";

  async function loadOffers(p_email: string, p_tracking_number: string) {
    setOffersLoading(true);
    setOffers([]);

    const { data, error } = await supabase.rpc("get_offers_for_tracking", {
      p_tracking_number,
      p_email,
    });

    setOffersLoading(false);

    if (error) {
      console.error("get_offers_for_tracking error:", error);
      setInfoMsg(
        error.message.includes("does not exist")
          ? "Offers API is not ready yet (get_offers_for_tracking missing)."
          : error.message
      );
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setOffers(rows as OfferRow[]);
  }

  async function refreshRequest(p_email: string, p_tracking_number: string) {
    const res = await getRequestByEmailTracking(p_email, p_tracking_number);
    if (res.row) setResult(res.row);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setResult(null);
    setOffers([]);

    if (!cleanEmail || !cleanTracking) {
      setErrorMsg("Please enter both email and tracking number.");
      return;
    }

    setLoading(true);

    const res = await getRequestByEmailTracking(cleanEmail, cleanTracking);

    setLoading(false);

    if (!res.row) {
      console.error("Track error:", res);
      setErrorMsg(res.error || "No request found for this email + tracking number.");
      return;
    }

    // helpful debug info for you (optional)
    // setInfoMsg(`Loaded via ${res.source}`);

    setResult(res.row);
    await loadOffers(cleanEmail, cleanTracking);
  }

  async function acceptOffer(offerId: string) {
    setErrorMsg("");
    setInfoMsg("");

    if (!cleanEmail || !cleanTracking || !result) {
      setErrorMsg("Please search your request again.");
      return;
    }

    if (acceptedOfferExists) {
      setInfoMsg("An offer is already accepted for this request.");
      return;
    }

    setAcceptingId(offerId);

    try {
      const { error } = await supabase.rpc("accept_offer_by_tracking", {
        p_tracking_number: cleanTracking,
        p_email: cleanEmail,
        p_offer_id: offerId,
      });

      if (error) {
        console.error("accept_offer_by_tracking error:", error);
        setErrorMsg(
          error.message.includes("does not exist")
            ? "Accept API is not ready yet (accept_offer_by_tracking missing)."
            : error.message
        );
        return;
      }

      setInfoMsg("Offer accepted ✅ The handyman will contact you soon.");
      await refreshRequest(cleanEmail, cleanTracking);
      await loadOffers(cleanEmail, cleanTracking);
    } finally {
      setAcceptingId(null);
    }
  }

  async function confirmCompletion() {
    setErrorMsg("");
    setInfoMsg("");

    if (!cleanEmail || !cleanTracking || !result) {
      setErrorMsg("Please search your request again.");
      return;
    }

    setConfirming(true);
    try {
      const { error } = await supabase.rpc("customer_confirm_completion_by_tracking", {
        p_tracking_number: cleanTracking,
        p_email: cleanEmail,
      });

      if (error) {
        const msg = error.message || "Could not confirm completion.";
        if (msg.includes("NOT_READY_TO_CONFIRM")) {
          setErrorMsg("This job is not ready for confirmation yet.");
        } else {
          setErrorMsg(msg);
        }
        return;
      }

      setInfoMsg("Thank you ✅ Marked as successfully completed.");
      await refreshRequest(cleanEmail, cleanTracking);
    } finally {
      setConfirming(false);
    }
  }

  async function reportProblem() {
    setErrorMsg("");
    setInfoMsg("");

    if (!cleanEmail || !cleanTracking || !result) {
      setErrorMsg("Please search your request again.");
      return;
    }

    const ok = window.confirm(
      "Report a problem with this job?\n\nThis will notify support and pause completion."
    );
    if (!ok) return;

    setReporting(true);
    try {
      const { error } = await supabase.rpc("customer_report_problem_by_tracking", {
        p_tracking_number: cleanTracking,
        p_email: cleanEmail,
      });

      if (error) {
        setErrorMsg(error.message || "Could not report the problem.");
        return;
      }

      setInfoMsg("Problem reported ✅ We'll follow up with you.");
      await refreshRequest(cleanEmail, cleanTracking);
    } finally {
      setReporting(false);
    }
  }

  const headerTracking = result?.tracking_number || cleanTracking || "—";

  return (
    <main style={pageWrap}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={h1}>Track your request</h1>
        <p style={sub}>
          Enter your email and tracking number to view your request status and handyman offers.
        </p>

        {/* SEARCH FORM */}
        <form onSubmit={handleSubmit} style={formCard}>
          <label style={field}>
            <span style={label}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              style={input}
            />
          </label>

          <label style={field}>
            <span style={label}>Tracking number</span>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 433136"
              style={input}
            />
          </label>

          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? "Checking..." : "Track"}
          </button>

          {errorMsg ? <div style={errorBox}>{errorMsg}</div> : null}
          {infoMsg ? <div style={infoBox}>{infoMsg}</div> : null}

          <div style={hint}>
            Your tracking number was emailed to you. Keep it secure.
          </div>
        </form>

        {/* RESULT */}
        {result ? (
          <div style={resultCard}>
            <div style={resultHeader}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>Your request</div>
                <span style={pill}>Tracking: {headerTracking}</span>
                <span style={pillMuted}>Job: {jobStatusLabel(result.job_status)}</span>
              </div>
              <div style={{ color: "#777", fontSize: 13 }}>
                Created: {safeDate(result.created_at)}
              </div>
            </div>

            {/* CONFIRM BLOCK */}
            {showConfirmBlock ? (
              <div style={confirmCard}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  The handyman marked this job as completed.
                </div>
                <div style={{ marginTop: 6, color: "#0b2a6f" }}>
                  If everything looks good, please confirm now (while you are together).
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={confirmCompletion}
                    disabled={confirming || reporting}
                    style={confirmBtn}
                  >
                    {confirming ? "Confirming…" : "Confirm completion"}
                  </button>

                  <button
                    type="button"
                    onClick={reportProblem}
                    disabled={confirming || reporting}
                    style={outlineBtn}
                  >
                    {reporting ? "Reporting…" : "Report a problem"}
                  </button>
                </div>
              </div>
            ) : null}

            {showCompleted ? (
              <div style={{ marginTop: 14, fontWeight: 900, color: "#0b2a6f" }}>
                ✅ Successfully completed.
              </div>
            ) : null}

            {showDispute ? (
              <div style={{ marginTop: 14, fontWeight: 900, color: "#a40000" }}>
                ⚠️ A problem was reported. Support will follow up.
              </div>
            ) : null}

            {/* DETAILS */}
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div>
                <div style={sectionTitle}>Title</div>
                <div>{result.title || "—"}</div>
              </div>

              <div>
                <div style={sectionTitle}>Description</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{result.description || "—"}</div>
              </div>

              <div>
                <div style={sectionTitle}>Media</div>
                {result.media_urls?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
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

            {/* OFFERS */}
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>
                Handyman offers
              </div>

              {offersLoading ? (
                <div style={{ color: "#666" }}>Loading offers…</div>
              ) : offers.length === 0 ? (
                <div style={{ color: "#666" }}>No offers yet. Please check back soon.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {offers.map((o) => {
                    const status = norm(o.status || "pending");
                    const isThisAccepted = status === "accepted";
                    const isRejected = status === "rejected";
                    const isWorking = acceptingId === o.offer_id;

                    const locked = acceptedOfferExists && !isThisAccepted;
                    const disabled = locked || isThisAccepted || isRejected || isWorking;

                    return (
                      <div key={o.offer_id} style={offerCard}>
                        <div style={offerTop}>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>{money(o.price_cents)}</div>

                          <span
                            style={{
                              ...offerBadge,
                              borderColor:
                                status === "accepted"
                                  ? "#0b2a6f"
                                  : status === "rejected"
                                  ? "#a40000"
                                  : "#000",
                              color:
                                status === "accepted"
                                  ? "#0b2a6f"
                                  : status === "rejected"
                                  ? "#a40000"
                                  : "#000",
                            }}
                          >
                            {status}
                          </span>
                        </div>

                        <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{o.message || "—"}</div>

                        <button
                          type="button"
                          onClick={() => acceptOffer(o.offer_id)}
                          disabled={disabled}
                          style={{
                            ...offerBtn,
                            background: disabled ? "#eee" : "#fff",
                            cursor: disabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {isThisAccepted
                            ? "Accepted"
                            : locked
                            ? "Locked (another offer accepted)"
                            : isWorking
                            ? "Accepting…"
                            : "Accept this offer"}
                        </button>

                        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                          After accepting, the handyman will see your contact details.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

/* ---------------- styles ---------------- */

const pageWrap: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#000000",
  minHeight: "100vh",
  padding: "120px 24px 80px",
  fontFamily: "Arial, sans-serif",
};

const h1: React.CSSProperties = {
  fontSize: 44,
  margin: "0 0 10px",
};

const sub: React.CSSProperties = {
  color: "#555",
  marginTop: 0,
  marginBottom: 24,
  maxWidth: 820,
  lineHeight: 1.35,
};

const formCard: React.CSSProperties = {
  display: "grid",
  gap: 12,
  maxWidth: 560,
  padding: 16,
  border: "1px solid #eee",
  borderRadius: 12,
  background: "#fff",
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: React.CSSProperties = {
  fontWeight: 800,
};

const input: React.CSSProperties = {
  padding: "12px 12px",
  borderRadius: 10,
  border: "1px solid #ccc",
  fontSize: 16,
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  marginTop: 6,
  padding: "14px 16px",
  borderRadius: 10,
  border: "none",
  background: "#000",
  color: "#fff",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
};

const hint: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  lineHeight: 1.4,
  marginTop: 2,
};

const errorBox: React.CSSProperties = {
  marginTop: 6,
  padding: 12,
  borderRadius: 10,
  background: "#fff3f3",
  border: "1px solid #ffd0d0",
  color: "#a40000",
  fontWeight: 700,
};

const infoBox: React.CSSProperties = {
  marginTop: 6,
  padding: 12,
  borderRadius: 10,
  background: "#f3f7ff",
  border: "1px solid #d6e3ff",
  color: "#0b2a6f",
  fontWeight: 700,
};

const resultCard: React.CSSProperties = {
  marginTop: 24,
  padding: 18,
  borderRadius: 12,
  border: "1px solid #eee",
  background: "#fff",
};

const resultHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const pill: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #000",
  fontSize: 13,
  fontWeight: 800,
};

const pillMuted: React.CSSProperties = {
  ...pill,
  borderColor: "#ddd",
  color: "#444",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 4,
};

const confirmCard: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #d6e3ff",
  background: "#f3f7ff",
};

const confirmBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "2px solid #000",
  background: "#000",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const outlineBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "2px solid #000",
  background: "#fff",
  color: "#000",
  fontWeight: 900,
  cursor: "pointer",
};

const offerCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const offerTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const offerBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #000",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const offerBtn: React.CSSProperties = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 10,
  border: "2px solid #000",
  fontWeight: 900,
};