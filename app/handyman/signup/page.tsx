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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    // 1) Auth user yarat
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setMessage("User yaradılmadı. Email confirmation aktiv ola bilər. Email-i yoxla.");
      setLoading(false);
      return;
    }

    // 2) Profil cədvəlinə yaz
    const { error: profileError } = await supabase.from("handyman_profiles").insert({
      id: user.id,          // handyman_profiles.id -> auth.users.id (uuid)
      full_name: fullName,
      phone: phone,
    });

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    // 3) Dashboard-a keç
    router.push("/handyman/dashboard");
    setLoading(false);
  }

  return (
    <div style={{ padding: 40, maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Become a Handyman - Signup</h1>

      <form onSubmit={handleSignup} style={{ marginTop: 20 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Full Name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          placeholder="John Smith"
          style={{ display: "block", marginBottom: 14, padding: 10, width: "100%" }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+1 215 000 0000"
          style={{ display: "block", marginBottom: 14, padding: 10, width: "100%" }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@example.com"
          style={{ display: "block", marginBottom: 14, padding: 10, width: "100%" }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Minimum 6+ chars"
          style={{ display: "block", marginBottom: 18, padding: 10, width: "100%" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        {message && (
          <p style={{ marginTop: 12, color: "red" }}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
