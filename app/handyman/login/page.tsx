"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HandymanLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Login alınmadı. Yenidən yoxla.");
        return;
      }

      // ✅ Login olduqdan sonra profil sətirini yarat / yenilə (upsert)
      // (Email confirmation ON olanda da burada artıq session var)
      const fullName = (data.user.user_metadata?.full_name as string) ?? "";
      const phone = (data.user.user_metadata?.phone as string) ?? "";

      const { error: profileError } = await supabase
        .from("handyman_profiles")
        .upsert(
          {
            id: data.user.id,
            full_name: fullName,
            phone: phone,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.log("handyman_profiles upsert error:", profileError);
        setMessage("Login oldu, amma profil tamamlanmadı. (RLS/policy yoxlanmalıdır)");
        return;
      }

      setMessage("Uğurlu login! Yönləndirirəm...");
      setTimeout(() => router.push("/handyman"), 800);
    } catch (err: any) {
      setMessage(err?.message ?? "Xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        Handyman Login
      </h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </form>
    </div>
  );
}