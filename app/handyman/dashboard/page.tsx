"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [message, setMessage] = useState<string>("");
  const [profile, setProfile] = useState<HandymanProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setMessage("");
      setLoading(true);

      // 1) Session yoxla
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        if (!isMounted) return;
        setMessage(sessionErr.message);
        setLoading(false);
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        // login olmayıbsa loginə at
        router.replace("/handyman/login");
        return;
      }

      // 2) Handyman profilini çək
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

      if (!data) {
        // Bu case adətən trigger işləməyəndə olur
        setMessage(
          "Profil tapılmadı. (handyman_profiles-da bu user üçün row yoxdur)."
        );
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
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
        Handyman Dashboard
      </h1>

      {loading ? (
        <p>Yüklənir...</p>
      ) : (
        <>
          {message && (
            <p style={{ padding: 12, border: "1px solid #000", background: "#fff" }}>
              {message}
            </p>
          )}

          {profile && (
            <div style={{ marginTop: 12, padding: 16, border: "1px solid #000" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Xoş gəldin{profile.full_name ? `, ${profile.full_name}` : ""}!
              </div>

              <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                <div>
                  <b>ID:</b> {profile.id}
                </div>
                <div>
                  <b>Telefon:</b> {profile.phone ?? "-"}
                </div>
                <div>
                  <b>Yaradılma:</b> {profile.created_at ?? "-"}
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  marginTop: 14,
                  padding: "8px 14px",
                  border: "1px solid #000",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}