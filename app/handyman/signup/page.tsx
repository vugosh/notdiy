"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HandymanSignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      // Supabase email confirmation ON-dursa, user-a mail gedəcək
      if (!data.user) {
        setMessage("Qeydiyyat tamamlanmadı. Yenidən yoxla.");
        return;
      }

      setMessage("Uğurlu! Email təsdiqi varsa, mailini yoxla. Login səhifəsinə yönləndirirəm...");
      setTimeout(() => router.push("/handyman/login"), 1200);
    } catch (err: any) {
      setMessage(err?.message ?? "Xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Handyman Signup</h1>

      <form onSubmit={handleSignup} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ padding: 10 }}
        />

        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: 10 }}
        />

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
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ padding: 10 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Creating..." : "Create account"}
        </button>

        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </form>
    </div>
  );
}
