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

  status: string | null; // closed/accepted/new və s.
  job_status: string | null; // awaiting_offers / waiting_customer_confirmation / completed / dispute ...

  tracking_number: string | null;
  created_at: string | null;
};

type OfferRow = {
  offer_id: string;
  message: string | null;
  price_cents: number | null;
  status: string | null; // pending/accepted/rejected
  created_at: string | null;
};

function norm(v: string | null | undefined) {
  return (v || "").toLowerCase().trim();
}

export default function TrackPage() {
  const [email, setEmail] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [infoMsg, setInfoMsg] = useState<string>("");

  const [result, setResult] = useState<RequestRow | null>(null);

  // offers
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // completion actions
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);

  async function loadOffers(p_email: string, p_tracking_number: string) {
    setOffersLoading(true);
    setOffers([]);
    setInfoMsg("");

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

    const rows = (Array.isArray(data) ? data : []) as any[];
    setOffers(rows as OfferRow[]);
  }

  async function refreshRequest(cleanEmail: string, cleanTracking: string) {
    const { data: refreshed, error } = await supabase.rpc(
      "get_request_by_tracking",
      {
        p_tracking_number: cleanTracking,
        p_email: cleanEmail,
      }
    );

    if (error) {
      console.error("get_request_by_tracking refresh error:", error);
      return;
    }

    // ✅ FIX: returns table -> array
    const row = Array.isArray(refreshed) ? refreshed[0] : refreshed;
    if (row) setResult(row as RequestRow);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setResult(null);
    setOffers([]);

    const cleanEmail = email.trim().toLowerCase();
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

    setLoading(false);

    if (error) {
      console.error("Track RPC error:", error);
      setErrorMsg(error.message || "Something went wrong. Please try again.");
      return;
    }

    // ✅ FIX: returns table -> array
    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      setErrorMsg("No request found for this email + tracking number.");
      return;
    }

    setResult(row as RequestRow);

    await loadOffers(cleanEmail, cleanTracking);
  }

  async function acceptOffer(offerId: string) {
    setErrorMsg("");
    setInfoMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanTracking = trackingNumber.trim();

    if (!cleanEmail || !cleanTracking || !result) {
      setErrorMsg("Please search your request again.");
      return;
    }

    // request artıq accepted olarsa blokla
    if (norm(result.status) === "accepted") {
      setInfoMsg("This request is already accepted.");
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

    const cleanEmail = email.trim().toLowerCase();
    const cleanTracking = trackingNumber.trim();

    if (!cleanEmail || !cleanTracking || !result) {
      setErrorMsg("Please search your request again.");
      return;
    }

    setConfirming(true);
    try {
      const { error } = await supabase.rpc(
        "customer_confirm_completion_by_tracking",
        {
          p_tracking_number: cleanTracking,
          p_email: cleanEmail,
        }
      );

      if (error) {
        const msg = error.message || "";
        if (msg.includes("NOT_READY_TO_CONFIRM")) {
          setErrorMsg("This job is not ready for confirmation yet.");
          return;
        }
        setErrorMsg(msg);
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

    const cleanEmail = email.trim().toLowerCase();
    const cleanTracking = trackingNumber.trim();

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

  // ✅ göstərmə qaydaları (status closed olsa belə job_status-a görə işləsin)
  const jobStatus = norm(result?.job_status);

  const showConfirmBlock = jobStatus === "waiting_customer_confirmation";
  const showCompleted = jobStatus === "completed";
  const showDispute = jobStatus === "dispute";

  const acceptedOfferExists = useMemo(() => {
    return offers.some((o) => norm(o.status) === "accepted");
  }, [offers]);

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
          Enter your email and tracking number to view your repair request and handyman offers.
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
              placeholder="e.g. 433136"
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

          {infoMsg ? (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 8,
                background: "#f3f7ff",
                border: "1px solid #d6e3ff",
                color: "#0b2a6f",
              }}
            >
              {infoMsg}
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 22 }}>Your request</h2>

              <span style={{ color: "#666", fontSize: 13 }}>
                Tracking: <strong>{result.tracking_number ?? "-"}</strong>
              </span>
            </div>

            {/* ✅ Job confirmation block */}
            {showConfirmBlock ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid #d6e3ff",
                  background: "#f3f7ff",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  The handyman marked this job as completed.
                </div>
                <div style={{ marginTop: 6, color: "#0b2a6f" }}>
                  If everything looks good, please confirm now.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={confirmCompletion}
                    disabled={confirming || reporting}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      border: "2px solid #000",
                      background: "#000",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: confirming ? "not-allowed" : "pointer",
                    }}
                  >
                    {confirming ? "Confirming…" : "Confirm completion"}
                  </button>

                  <button
                    type="button"
                    onClick={reportProblem}
                    disabled={confirming || reporting}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      border: "2px solid #000",
                      background: "#fff",
                      color: "#000",
                      fontWeight: 900,
                      cursor: reporting ? "not-allowed" : "pointer",
                    }}
                  >
                    {reporting ? "Reporting…" : "Report a problem"}
                  </button>
                </div>
              </div>
            ) : null}

            {showCompleted ? (
              <div style={{ marginTop: 14, color: "#0b2a6f", fontWeight: 800 }}>
                ✅ This job is marked as successfully completed.
              </div>
            ) : null}

            {showDispute ? (
              <div style={{ marginTop: 14, color: "#a40000", fontWeight: 800 }}>
                ⚠️ A problem was reported. Support will follow up.
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Title</div>
                <div>{result.title ?? "-"}</div>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Description
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {result.description ?? "-"}
                </div>
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

            {/* OFFERS */}
            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>
                Handyman offers
              </h3>

              {offersLoading ? (
                <div style={{ color: "#666" }}>Loading offers…</div>
              ) : offers.length === 0 ? (
                <div style={{ color: "#666" }}>
                  No offers yet. Please check back soon.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {offers.map((o) => {
                    const price =
                      o.price_cents != null
                        ? `$${(Number(o.price_cents) / 100).toFixed(2)}`
                        : "—";

                    const status = norm(o.status || "pending");
                    const isThisAccepted = status === "accepted";
                    const disabled = acceptedOfferExists || isThisAccepted || status === "rejected";
                    const isWorking = acceptingId === o.offer_id;

                    return (
                      <div
                        key={o.offer_id}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 10,
                          padding: 14,
                          background: "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontSize: 18, fontWeight: 900 }}>
                            {price}
                          </div>
                          <div style={{ fontSize: 13, color: "#666" }}>
                            {status}
                          </div>
                        </div>

                        <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                          {o.message || "—"}
                        </div>

                        <button
                          type="button"
                          onClick={() => acceptOffer(o.offer_id)}
                          disabled={disabled || isWorking}
                          style={{
                            marginTop: 12,
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: "2px solid #000",
                            background: disabled ? "#eee" : "#fff",
                            fontWeight: 900,
                            cursor: disabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {isThisAccepted
                            ? "Accepted"
                            : acceptedOfferExists
                            ? "Accepted (request locked)"
                            : isWorking
                            ? "Accepting…"
                            : "Accept this offer"}
                        </button>

                        <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
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