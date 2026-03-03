"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DashItem = {
  offer_id: string;
  offer_status: string | null;
  price_cents: number | null;
  offer_message: string | null;
  offer_created_at: string | null;

  request_id: string;
  request_status: string | null;
  request_created_at: string | null;
  title: string | null;
  description: string | null;
  zip: string | null;
  media_urls: string[] | null;

  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
};

export default function HandymanDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [walletUsd, setWalletUsd] = useState("0.00");
  const [items, setItems] = useState<DashItem[]>([]);

  async function refreshWallet() {
    const { data, error } = await supabase.rpc("get_wallet_balance_cents");
    if (error) {
      console.error(error);
      return;
    }
    const cents = Number(data ?? 0);
    setWalletUsd((cents / 100).toFixed(2));
  }

  async function loadDashboard() {
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      router.push("/handyman/login");
      return;
    }

    const { data, error } = await supabase.rpc("get_handyman_dashboard_items");

    if (error) {
      console.error("Dashboard RPC error:", error);
      setMessage(error.message);
      setItems([]);
      return;
    }

    setItems((Array.isArray(data) ? data : []) as DashItem[]);
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!mounted) return;
      setLoading(true);
      await refreshWallet();
      await loadDashboard();
      if (!mounted) return;
      setLoading(false);
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    setMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) return setMessage(error.message);
    router.push("/handyman/login");
  }

  const pending = useMemo(
    () =>
      items.filter((x) => (x.offer_status || "").toLowerCase() === "pending"),
    [items]
  );
  const accepted = useMemo(
    () =>
      items.filter((x) => (x.offer_status || "").toLowerCase() === "accepted"),
    [items]
  );
  const rejected = useMemo(
    () =>
      items.filter((x) => (x.offer_status || "").toLowerCase() === "rejected"),
    [items]
  );

  function money(cents: number | null) {
    const v = Number(cents ?? 0);
    return `$${(v / 100).toFixed(2)}`;
  }

  return (
    <div style={pageWrap}>
      <div style={topBar}>
        <div>
          <h1 style={h1}>Handyman Dashboard</h1>
          <div style={{ marginTop: 8, fontSize: 18 }}>
            Wallet balance: <b>${walletUsd}</b>
          </div>
          <div style={{ marginTop: 6, color: "#666" }}>
            Pending: <b>{pending.length}</b> • Accepted: <b>{accepted.length}</b>{" "}
            • Rejected: <b>{rejected.length}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/repair-jobs" style={{ textDecoration: "none" }}>
            <button style={btn}>Find jobs</button>
          </Link>
          <button style={btn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {message ? <div style={notice}>{message}</div> : null}

      {loading ? (
        <div style={{ marginTop: 18, color: "#666" }}>Loading…</div>
      ) : (
        <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
          <Section title="Accepted jobs (contact unlocked)" items={accepted} showContact />
          <Section title="Pending offers" items={pending} />
          <Section title="Rejected offers" items={rejected} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  showContact,
}: {
  title: string;
  items: DashItem[];
  showContact?: boolean;
}) {
  return (
    <div style={card}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
        {title} <span style={{ color: "#666", fontWeight: 700 }}>({items.length})</span>
      </div>

      {items.length === 0 ? (
        <div style={{ color: "#666" }}>Nothing here yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((x) => (
            <div key={x.offer_id} style={jobCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>
                    {x.title || "Untitled job"}
                  </div>
                  <div style={{ color: "#666", marginTop: 4, fontSize: 13 }}>
                    Offer: <b>{(x.offer_status || "—").toUpperCase()}</b> • Price:{" "}
                    <b>{money(x.price_cents)}</b> • ZIP: {x.zip || "—"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, fontWeight: 700 }}>
                {x.description || "—"}
              </div>

              <div style={{ marginTop: 10, color: "#444" }}>
                <b>Your message:</b> {x.offer_message || "—"}
              </div>

              {x.media_urls?.length ? (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800 }}>Media</div>
                  {x.media_urls.map((u, idx) => (
                    <a
                      key={idx}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#000", textDecoration: "underline" }}
                    >
                      Open file {idx + 1}
                    </a>
                  ))}
                </div>
              ) : null}

              {showContact ? (
                <div style={contactBox}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    Customer contact
                  </div>
                  <div>
                    <b>Name:</b> {x.customer_first_name || "—"}{" "}
                    {x.customer_last_name || ""}
                  </div>
                  <div>
                    <b>Phone:</b> {x.customer_phone || "—"}
                  </div>
                  <div>
                    <b>Email:</b> {x.customer_email || "—"}
                  </div>
                  <div>
                    <b>Address:</b> {x.customer_address || "—"}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
                  Contact details are hidden until the customer accepts your offer.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function money(cents: number | null) {
  const v = Number(cents ?? 0);
  return `$${(v / 100).toFixed(2)}`;
}

/* styles */
const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "28px 24px 60px",
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: 52,
  letterSpacing: "-0.5px",
};

const btn: React.CSSProperties = {
  padding: "10px 18px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const notice: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 12px",
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
};

const card: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 16,
};

const jobCard: React.CSSProperties = {
  border: "1px solid #eee",
  padding: 14,
  background: "#fff",
};

const contactBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  border: "1px solid #000",
  background: "#fff",
};