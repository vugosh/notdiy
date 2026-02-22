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

function getInitials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "H";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : "") ?? "";
  return (first + last).toUpperCase();
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US");
}

export default function HandymanDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [profile, setProfile] = useState<HandymanProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const initials = useMemo(() => getInitials(profile?.full_name), [profile?.full_name]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setMessage("");
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr) {
        if (!isMounted) return;
        setMessage(sessionErr.message);
        setLoading(false);
        return;
      }

      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/handyman/login");
        return;
      }

      // Email comes from auth user
      setEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("handyman_profiles")
        .select("id, full_name, phone, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setProfile(data as HandymanProfile);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Dashboard</h1>
          <p style={{ margin: "6px 0 0", color: "#444" }}>
            Track your work, view new jobs, and manage your account.
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 14px",
            border: "1px solid #000",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Logout
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 16, border: "1px solid #eee" }}>Loading...</div>
      ) : (
        <>
          {message && (
            <div style={{ padding: 12, border: "1px solid #000", background: "#fff", marginBottom: 14 }}>
              {message}
            </div>
          )}

          {/* Top grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
            {/* Profile card */}
            <div style={{ border: "1px solid #eee", background: "#fff", padding: 18 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: "1px solid #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {initials}
                </div>

                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
                  </div>
                  <div style={{ marginTop: 4, color: "#444", fontSize: 14 }}>
                    Status: <b>Active</b>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <InfoBox label="Phone" value={profile?.phone ?? "-"} />
                <InfoBox label="Email" value={email ?? "-"} />
                <InfoBox label="Joined" value={formatDate(profile?.created_at)} />
                <InfoBox label="Handyman ID" value={profile?.id ?? "-"} />
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  disabled
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #000",
                    background: "#f4f4f4",
                    cursor: "not-allowed",
                    fontWeight: 700,
                  }}
                >
                  Edit profile (soon)
                </button>

                <Link href="/jobs" style={{ textDecoration: "none" }}>
                  <button
                    style={{
                      padding: "10px 14px",
                      border: "1px solid #000",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    View available jobs
                  </button>
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ border: "1px solid #eee", background: "#fff", padding: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Quick Actions</div>

              <div style={{ display: "grid", gap: 10 }}>
                <Link href="/jobs" style={{ textDecoration: "none" }}>
                  <button
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1px solid #000",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                      textAlign: "left",
                    }}
                  >
                    🔎 Browse jobs
                  </button>
                </Link>

                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #000",
                    background: "#f4f4f4",
                    cursor: "not-allowed",
                    fontWeight: 700,
                    textAlign: "left",
                  }}
                >
                  🧾 My offers (soon)
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #000",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                    textAlign: "left",
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <StatBox label="Available jobs" />
            <StatBox label="My active offers" />
            <StatBox label="Completed jobs" />
          </div>
        </>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, border: "1px solid #eee" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatBox({ label }: { label: string }) {
  return (
    <div style={{ border: "1px solid #eee", background: "#fff", padding: 16 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>—</div>
    </div>
  );
}