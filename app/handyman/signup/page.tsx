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

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }

    const user = data.user;
    if (!user) {
      setMessage("User yaradılmadı (signUp nəticəsi boşdur).");
      return;
    }

    const { error: profileError } = await supabase
      .from("handyman_profiles")
      .insert({
        id: user.id,
        full_name: fullName,
        phone,
      });

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    router.push("/handyman/dashboard");
  }

  return (
    <div style={{ padding: 40, maxWidth: 520 }}>
      <h1>Become a Handyman - Signup</h1>

      <form onSubmit={handleSignup} style={{ marginTop: 16 }}>
        <input
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <button type="submit" style={{ padding: 10 }}>
          Create Account
        </button>

        {message && <p style={{ marginTop: 10, color: "red" }}>{message}</p>}
      </form>
    </div>
  );
}
