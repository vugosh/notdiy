"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type HandymanProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
};

export default function HandymanDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<HandymanProfile | null>(null);
  const [balanceUsd, setBalanceUsd] = useState<string>("0.00");
  const [message, setMessage] = useState<string>("");

  const initials = useMemo(() => {
    const name = (profile?.full_name || "").trim();
    if (!name) return "HM";
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "H";
    const b =
      parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] ?? "M";
    return (a + (b ?? "")).toUpperCase();
  }, [profile?.full_name]);

  const joinedAt = useMemo(() => {
    if (!profile?.created_at) return "—";
    const d = new Date(profile.created_at);
    if (Number.isNaN(d.getTime())) return profile.created_at;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [profile?.created_at]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setMessage("");

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      if (sessionErr) {
        if (isMounted) setMessage(sessionErr.message);
        setLoading(false);
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        router.push("/handyman/login");
        return;
      }

      if (isMounted) setEmail(user.email ?? "");

      // ✅ Fetch profile
      const { data: prof, error: profErr } = await supabase
        .from("handyman_profiles")
        .select("id, full_name, phone, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) {
        if (isMounted) setMessage(profErr.message);
      } else {
        if (isMounted) setProfile(prof ?? null);
      }

      // ✅ Fetch wallet balance (cents -> USD)
      const { data: walletRow, error: walletErr } = await supabase
        .from("handyman_wallets")
        .select("balance_cents")
        .eq("handyman_id", user.id)
        .single();

      if (walletErr) {
        // Wallet row might not exist yet for some users; default to $0.00
        if (
          isMounted &&
          walletErr.code !== "PGRST116" && // no rows returned
          walletErr.message
        ) {
          // Don't block UI; show message but keep going
          setMessage((prev) => prev || walletErr.message);
        }
        if (isMounted) setBalanceUsd("0.00");
      } else {
        const balanceCents = walletRow?.balance_cents ?? 0;
        const usd = (balanceCents / 100).toFixed(2);
        if (isMounted) setBalanceUsd(usd);
      }

      if (isMounted) setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [router]);

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
      <div style={topRow}>
        <div>
          <h1 style={h1}>Dashboard</h1>
          <p style={sub}>Track your work, browse new jobs, and manage your account.</p>
        </div>

        <button onClick={handleLogout} style={logoutBtn}>
          Logout
        </button>
      </div>

      {message && <div style={notice}>{message}</div>}

      <div className="dashGrid" style={dashGrid}>
        {/* LEFT: PROFILE CARD */}
        <div style={card}>
          <div style={profileHeader}>
            <div style={avatar}>{initials}</div>

            <div style={{ minWidth: 0 }}>
              <div style={welcomeLine}>
                Welcome, <span style={{ fontWeight: 800 }}>{profile?.full_name ?? "Handyman"}!</span>
              </div>
              <div style={statusLine}>
                Status: <span style={{ fontWeight: 700 }}>Active</span>
              </div>
            </div>
          </div>

          <div className="infoGrid" style={infoGrid}>
            <InfoBox label="Phone" value={profile?.phone || "—"} />
            <InfoBox label="Email" value={email || "—"} />
            <InfoBox label="Balance" value={`$${balanceUsd}`} />
            <InfoBox label="Joined" value={joinedAt} />
            <InfoBox label="Handyman ID" value={profile?.id || "—"} mono />
          </div>

          <div className="profileBtns" style={profileBtns}>
            <button style={btnDisabled} disabled>
              Edit profile (soon)
            </button>

            <Link href="/repair-jobs" style={{ textDecoration: "none" }}>
              <button style={btnPrimary}>View available jobs</button>
            </Link>
          </div>
        </div>

        {/* RIGHT: QUICK ACTIONS */}
        <div style={card}>
          <h2 style={h2}>Quick Actions</h2>

          <div className="qa" style={qaWrap}>
            <Link href="/repair-jobs" style={{ textDecoration: "none" }}>
              <button style={qaBtn}>
                <span style={{ marginRight: 8 }}>🔎</span> Browse jobs
              </button>
            </Link>

            <button style={qaBtnDisabled} disabled>
              <span style={{ marginRight: 8 }}>🧾</span> My offers (soon)
            </button>

            <button onClick={handleLogout} style={qaBtn}>
              <span style={{ marginRight: 8 }}>🚪</span> Logout
            </button>
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="statsRow" style={statsRow}>
        <StatCard title="Available jobs" value="—" />
        <StatCard title="My active offers" value="—" />
        <StatCard title="Completed jobs" value="—" />
      </div>

      {/* RESPONSIVE FIXES */}
      <style jsx>{`
        @media (max-width: 900px) {
          .dashGrid {
            grid-template-columns: 1fr !important;
          }
          .statsRow {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          .infoGrid {
            grid-template-columns: 1fr !important;
          }
          .profileBtns {
            grid-template-columns: 1fr !important;
          }
          .qa button {
            width: 100% !important;
          }
        }
      `}</style>

      {loading && (
        <div style={{ marginTop: 14, color: "#666", fontSize: 14 }}>
          Loading your dashboard…
        </div>
      )}
    </div>
  );
}

/* ---------- Small components ---------- */

function InfoBox({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={infoBox}>
      <div style={infoLabel}>{label}</div>
      <div style={{ ...infoValue, ...(mono ? monoText : null) }}>{value}</div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={statTitle}>{title}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

/* ---------- Styles (inline) ---------- */

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
  margin: "6px 0 0",
  fontSize: 18,
  color: "#444",
};

const logoutBtn: React.CSSProperties = {
  padding: "10px 18px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  alignSelf: "flex-start",
};

const notice: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
};

const dashGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 22,
  marginTop: 18,
};

const card: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 18,
};

const profileHeader: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  marginBottom: 14,
};

const avatar: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "999px",
  border: "2px solid #000",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 22,
};

const welcomeLine: React.CSSProperties = {
  fontSize: 28,
  lineHeight: 1.1,
  marginBottom: 4,
  wordBreak: "break-word",
};

const statusLine: React.CSSProperties = {
  fontSize: 16,
  color: "#333",
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 12,
};

const infoBox: React.CSSProperties = {
  border: "1px solid #efefef",
  padding: 14,
  minWidth: 0,
};

const infoLabel: React.CSSProperties = {
  fontSize: 14,
  color: "#666",
  marginBottom: 6,
};

const infoValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  wordBreak: "break-word",
};

const monoText: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 16,
  fontWeight: 700,
};

const profileBtns: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 14,
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const btnDisabled: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "2px solid #000",
  background: "#f5f5f5",
  color: "#9a9a9a",
  cursor: "not-allowed",
  fontWeight: 800,
};

const h2: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
};

const qaWrap: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 14,
};

const qaBtn: React.CSSProperties = {
  width: "100%",
  padding: "14px 14px",
  border: "2px solid #000",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  textAlign: "left",
};

const qaBtnDisabled: React.CSSProperties = {
  width: "100%",
  padding: "14px 14px",
  border: "2px solid #000",
  background: "#f5f5f5",
  color: "#9a9a9a",
  cursor: "not-allowed",
  fontWeight: 800,
  textAlign: "left",
};

const statsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 18,
  marginTop: 22,
};

const statCard: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  padding: 16,
};

const statTitle: React.CSSProperties = {
  color: "#666",
  fontSize: 16,
  marginBottom: 10,
};

const statValue: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
};