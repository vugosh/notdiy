"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type DashItem = {
  offer_id: string;
  offer_status: string | null; // pending/accepted/rejected/marked_completed/completed
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

function norm(v: string | null | undefined) {
  return (v || "").toLowerCase().trim();
}

function money(cents: number | null) {
  const v = Number(cents ?? 0);
  return `$${(v / 100).toFixed(2)}`;
}

export default function HandymanDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  const [walletUsd, setWalletUsd] = useState("0.00");
  const [items, setItems] = useState<DashItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // local UI hint (ok to keep, but DB status is the source of truth)
  const [markedCompletedIds, setMarkedCompletedIds] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function refreshWallet() {
    const { data, error } = await supabase.rpc("get_wallet_balance_cents");
    if (error) {
      console.error("get_wallet_balance_cents error:", error);
      return;
    }
    const cents = Number(data ?? 0);
    setWalletUsd((cents / 100).toFixed(2));
  }

  async function loadDashboard() {
    const { data, error } = await supabase.rpc("get_handyman_dashboard_items");
    if (error) {
      console.error("get_handyman_dashboard_items error:", error);
      setMessage(error.message);
      setItems([]);
      return;
    }
    setItems((Array.isArray(data) ? data : []) as DashItem[]);
  }

  async function refreshAll() {
    setMessage("");
    setRefreshing(true);
    try {
      await refreshWallet();
      await loadDashboard();
      setLastUpdated(new Date().toLocaleString());
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      if (!mounted) return;

      setLoading(true);
      setMessage("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push("/handyman/login");
        return;
      }

      setUserId(user.id);

      await refreshAll();

      if (!mounted) return;
      setLoading(false);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (!u) router.push("/handyman/login");
      else setUserId(u.id);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // ✅ Realtime: offers + wallet changes -> auto refresh
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`handyman-dashboard-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "offers",
          filter: `handyman_id=eq.${userId}`,
        },
        async () => {
          await refreshAll();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_transactions",
          filter: `handyman_id=eq.${userId}`,
        },
        async () => {
          await refreshWallet();
          setLastUpdated(new Date().toLocaleString());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleLogout() {
    setMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) return setMessage(error.message);
    router.push("/handyman/login");
  }

  async function markAsCompleted(requestId: string) {
    setMessage("");
    if (!requestId) return;

    setMarkingId(requestId);
    try {
      const { error } = await supabase.rpc("handyman_mark_completed", {
        p_request_id: requestId,
      });

      if (error) {
        const raw = error.message || "";
        const msg = raw.toUpperCase();

        // ✅ FIX: ALREADY_MARKED / NOT_IN_PROGRESS -> no error message,
        // and ALSO mark locally so button turns into "Waiting..."
        if (msg.includes("ALREADY_MARKED") || msg.includes("NOT_IN_PROGRESS")) {
          setMarkedCompletedIds((prev) => {
            const next = new Set(prev);
            next.add(requestId);
            return next;
          });

          await refreshAll();
          return;
        }

        if (msg.includes("NOT_ALLOWED")) {
          setMessage("You are not allowed to update this job.");
        } else if (msg.includes("NOT_AUTHENTICATED")) {
          setMessage("Please login again.");
          router.push("/handyman/login");
        } else if (raw.includes("does not exist")) {
          setMessage("RPC missing: handyman_mark_completed is not created yet in Supabase.");
        } else {
          setMessage(raw);
        }
        return;
      }

      // ✅ SUCCESS: mark locally so UI changes immediately
      setMarkedCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(requestId);
        return next;
      });

      setMessage("Marked completed ✅ Ask the customer to confirm now (on their tracking page).");
      await refreshAll();
    } finally {
      setMarkingId(null);
    }
  }

  const pending = useMemo(() => items.filter((x) => norm(x.offer_status) === "pending"), [items]);
  const accepted = useMemo(() => items.filter((x) => norm(x.offer_status) === "accepted"), [items]);
  const rejected = useMemo(() => items.filter((x) => norm(x.offer_status) === "rejected"), [items]);

  return (
    <div style={pageWrap}>
      <div style={topBar}>
        <div>
          <h1 style={h1}>Handyman Dashboard</h1>

          <div style={{ marginTop: 8, fontSize: 18 }}>
            Wallet balance: <b>${walletUsd}</b>
          </div>

          <div style={{ marginTop: 6, color: "#666" }}>
            Pending: <b>{pending.length}</b> • Accepted: <b>{accepted.length}</b> • Rejected:{" "}
            <b>{rejected.length}</b>
          </div>

          {lastUpdated ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
              Last updated: {lastUpdated}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={btn} onClick={refreshAll} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

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
          <Section
            title="Accepted jobs (contact unlocked)"
            items={accepted}
            showContact
            onMarkCompleted={markAsCompleted}
            markingId={markingId}
            markedCompletedIds={markedCompletedIds}
          />
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
  onMarkCompleted,
  markingId,
  markedCompletedIds,
}: {
  title: string;
  items: DashItem[];
  showContact?: boolean;
  onMarkCompleted?: (requestId: string) => void;
  markingId?: string | null;
  markedCompletedIds?: Set<string>;
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
          {items.map((x) => {
            const canMarkCompleted = !!showContact && !!onMarkCompleted;
            const isMarking = markingId === x.request_id;

            // ✅ DB is source of truth
            const st = norm(x.offer_status);
            const isAccepted = st === "accepted";
            const isWaitingCustomer =
              st === "marked_completed" || st === "waiting_customer_confirmation";
            const isCompleted = st === "completed";

            // local hint (secondary)
            const isMarkedLocal = markedCompletedIds?.has(x.request_id) ?? false;

            // ✅ button only when ACCEPTED and NOT locally marked
            const showMarkBtn = canMarkCompleted && isAccepted && !isMarkedLocal;

            return (
              <div key={x.offer_id} style={jobCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{x.title || "Untitled job"}</div>
                    <div style={{ color: "#666", marginTop: 4, fontSize: 13 }}>
                      Offer: <b>{(x.offer_status || "—").toUpperCase()}</b> • Price:{" "}
                      <b>{money(x.price_cents)}</b> • ZIP: {x.zip || "—"}
                    </div>
                  </div>

                  {/* ✅ FIXED LOGIC */}
                  {showMarkBtn ? (
                    <button
                      type="button"
                      style={{
                        ...btnSmall,
                        cursor: isMarking ? "not-allowed" : "pointer",
                        opacity: isMarking ? 0.7 : 1,
                      }}
                      disabled={isMarking}
                      onClick={() => onMarkCompleted!(x.request_id)}
                      title="After finishing the job, mark it completed so the customer can confirm."
                    >
                      {isMarking ? "Marking…" : "Mark as completed"}
                    </button>
                  ) : isWaitingCustomer || isMarkedLocal ? (
                    <div style={{ fontWeight: 900, alignSelf: "center" }}>
                      Waiting for customer confirmation…
                    </div>
                  ) : isCompleted ? (
                    <div style={{ fontWeight: 900, alignSelf: "center" }}>
                      ✅ Successfully completed
                    </div>
                  ) : null}
                </div>

                <div style={{ marginTop: 10, fontWeight: 700 }}>{x.description || "—"}</div>

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
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Customer contact</div>
                    <div>
                      <b>Name:</b> {x.customer_first_name || "—"} {x.customer_last_name || ""}
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
            );
          })}
        </div>
      )}
    </div>
  );
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
  flexWrap: "wrap",
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

const btnSmall: React.CSSProperties = {
  padding: "10px 12px",
  border: "2px solid #000",
  background: "#fff",
  fontWeight: 900,
  whiteSpace: "nowrap",
  height: 44,
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