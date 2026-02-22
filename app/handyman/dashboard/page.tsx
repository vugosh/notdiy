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
  return d.toLocaleString();
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

      // 1️⃣ Session yoxla
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

      setEmail(user.email ?? null);

      // 2️⃣ Profil çək
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
            İşləri izlə, yeni job-lara bax və hesabını idarə et.
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
        <div style={{ padding: 16, border: "1px solid #eee" }}>Yüklənir...</div>
      ) : (
        <div
          style={{
            border: "1px solid #eee",
            background: "#fff",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                border: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                Xoş gəldin{profile?.full_name ? `, ${profile.full_name}` : ""}!
              </div>
              <div style={{ marginTop: 4, color: "#444" }}>
                Status: <b>Active</b>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <InfoBox label="Telefon" value={profile?.phone ?? "-"} />
            <InfoBox label="Email" value={email ?? "-"} />
            <InfoBox label="Qeydiyyat tarixi" value={formatDate(profile?.created_at)} />
            <InfoBox label="Handyman ID" value={profile?.id ?? "-"} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 14, border: "1px solid #eee" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}