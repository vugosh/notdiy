"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RequestRow = Record<string, any>;

export default function RepairJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [message, setMessage] = useState<string>("");

  const [walletLoading, setWalletLoading] = useState(true);
  const [balanceUsd, setBalanceUsd] = useState<string>("0.00");

  // offer UI state
  const [openOfferFor, setOpenOfferFor] = useState<string | null>(null);
  const [priceUsd, setPriceUsd] = useState<string>("1.00");
  const [submitting, setSubmitting] = useState(false);

  const balanceLabel = useMemo(() => `$${balanceUsd}`, [balanceUsd]);

  async function loadWallet(userId: string) {
    setWalletLoading(true);
    const { data: walletRow, error: walletErr } = await supabase
      .from("handyman_wallets")
      .select("balance_cents")
      .eq("handyman_id", userId)
      .single();

    if (walletErr) {
      // wallet row olmaya da bilər (amma səndə artıq trigger/seed var)
      setBalanceUsd("0.00");
    } else {
      const cents = walletRow?.balance_cents ?? 0;
      setBalanceUsd((cents / 100).toFixed(2));
    }
    setWalletLoading(false);
  }

  async function loadRequests() {
    setLoading(true);
    setMessage("");

    // requests sütunlarını tam bilmədiyimiz üçün select("*") edirik.
    // Sonra UI-də “title/description” üçün ən çox rast gəlinən field-ləri yoxlayırıq.
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setMessage(error.message);
      setRequests([]);
    } else {
      setRequests(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setLoading(true);
      setMessage("");

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        if (mounted) setMessage(sessionErr.message);
        if (mounted) setLoading(false);
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        router.push("/handyman/login");
        return;
      }

      // wallet + requests paralel
      await Promise.all([loadWallet(user.id), loadRequests()]);
    }

    boot();
    return () => {
      mounted = false;
    };
  }, [router]);

  function getTitle(r: RequestRow) {
    return (
      r.title ??
      r.issue_title ??
      r.problem_title ??
      r.subject ??
      r.issue ??
      r.problem ??
      "Repair Request"
    );
  }

  function getDescription(r: RequestRow) {
    return (
      r.description ??
      r.issue_description ??
      r.problem_description ??
      r.details ??
      r.notes ??
      ""
    );
  }

  function formatDate(v: any) {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function toCentsFromUsdString(v: string) {
    // "12.34" -> 1234
    const cleaned = (v || "").trim().replace("$", "");
    if (!cleaned) return 0;
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return 0;
    return Math.round(num * 100);
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

  async function submitOffer(requestId: string) {
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      router.push("/handyman/login");
      return;
    }

    const cents = toCentsFromUsdString(priceUsd);
    if (cents <= 0) {
      setMessage("Please enter a valid offer amount.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_offer_and_charge", {
        request_id: requestId,
        price_cents: cents,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("✅ Offer sent successfully.");
      setOpenOfferFor(null);
      setPriceUsd("1.00");

      // balans yenilə
      await loadWallet(user.id);

      // istəsən list də refresh ola bilər (şərt deyil)
      // await loadRequests();

      return data;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <div>
          <h1 style={h1}>Available Jobs</h1>
          <p style={sub}>
            Browse posted repair requests and send an offer. Each offer costs{" "}
            <b>$1</b> from your wallet.
          </p>

          <div style={walletLine}>
            <span style={{ color: "#666" }}>Wallet balance:</span>{" "}
            <b>{walletLoading ? "Loading…" : balanceLabel}</b>
            <span style={{ marginLeft: 12, color: "#999" }}>
              (Top-up page coming soon)
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Link href="/handyman/dashboard" style={{ textDecoration: "none" }}>
            <button style={btnOutline}>Dashboard</button>
          </Link>

          <button onClick={handleLogout} style={btnOutline}>
            Logout
          </button>
        </div>
      </div>

      {message && <div style={notice}>{message}</div>}

      {loading ? (
        <div style={{ marginTop: 12, color: "#666" }}>Loading jobs…</div>
      ) : requests.length === 0 ? (
        <div style={{ marginTop: 12, color: "#666" }}>
          No jobs yet.
        </div>
      ) : (
        <div style={grid}>
          {requests.map((r) => {
            const id = String(r.id ?? "");
            const title = getTitle(r);
            const desc = getDescription(r);
            const created = formatDate(r.created_at);
            const location =
              r.city || r.state || r.zip_code
                ? `${r.city ?? ""}${r.city && r.state ? ", " : ""}${r.state ?? ""}${(r.city || r.state) && r.zip_code ? " " : ""}${r.zip_code ?? ""}`.trim()
                : null;

            return (
              <div key={id} style={card}>
                <div style={cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={titleStyle}>{title}</div>
                    <div style={meta}>
                      Posted: <b>{created}</b>
                      {location ? (
                        <>
                          {" "}
                          • Location: <b>{location}</b>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <button
                    style={btnPrimary}
                    onClick={() => {
                      setMessage("");
                      setOpenOfferFor(id);
                      setPriceUsd("1.00");
                    }}
                  >
                    Make offer ($1)
                  </button>
                </div>

                {desc ? <div style={descStyle}>{desc}</div> : null}

                {openOfferFor === id && (
                  <div style={offerBox}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>
                      Send an offer
                    </div>

                    <div style={offerRow}>
                      <label style={label}>Your price (USD)</label>
                      <input
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(e.target.value)}
                        placeholder="e.g. 75.00"
                        inputMode="decimal"
                        style={input}
                      />
                    </div>

                    <div style={offerActions}>
                      <button
                        style={btnOutline}
                        onClick={() => setOpenOfferFor(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </button>

                      <button
                        style={btnPrimaryWide}
                        onClick={() => submitOffer(id)}
                        disabled={submitting}
                      >
                        {submitting ? "Sending…" : "Send offer"}
                      </button>
                    </div>

                    <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                      Note: Each offer deducts <b>$1</b> from your wallet.
                    </div>
                  </div>
                )}

                <div style={tinyId}>
                  Request ID: <span style={mono}>{id || "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          h1 {
            font-size: 44px !important;
          }
        }
        @media (max-width: 640px) {
          .topRow {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .topRowRight {
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- styles ---------- */

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "28px 24px 40px",
};

const topRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14,
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: 56,
  letterSpacing: "-0.5px",
};

const sub: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 18,
  color: "#444",
};

const walletLine: React.CSSProperties = {
  marginTop: 10,
  fontSize: 15,
};

const notice: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
};

const grid: React.CSSProperties = {
  marginTop: 16,
  display: "grid",
  gap: 14,
};

const card: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 16,
};

const cardTop: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  justifyContent: "space-between",
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1.2,
  marginBottom: 6,
  wordBreak: "break-word",
};

const meta: React.CSSProperties = {
  fontSize: 14,
  color: "#666",
};

const descStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 16,
  color: "#222",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
};

const offerBox: React.CSSProperties = {
  marginTop: 14,
  padding: 14,
  border: "1px solid #efefef",
  background: "#fff",
};

const offerRow: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginTop: 6,
};

const label: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ccc",
  fontSize: 16,
  outline: "none",
};

const offerActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 12,
};

const btnOutline: React.CSSProperties = {
  padding: "10px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const btnPrimaryWide: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const tinyId: React.CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  color: "#777",
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};