"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HandymanLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

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

      setMessage("Uğurlu! Dashboard-a yönləndirirəm...");
      setTimeout(() => router.push("/handyman/dashboard"), 500);
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
          style={{
            padding: 10,
            cursor: loading ? "not-allowed" : "pointer",
            border: "1px solid #000",
            background: "#fff",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </form>
    </div>
  );
}