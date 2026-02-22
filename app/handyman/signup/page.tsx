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
            phone: phone,
            role: "handyman", // istəsən saxla, gələcəkdə işə yarayır
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Qeydiyyat tamamlanmadı. Yenidən yoxla.");
        return;
      }

      // ✅ Əgər session varsa (email confirmation OFF) -> user artıq authenticated-dir
      // Bu halda handyman_profiles cədvəlinə dərhal yazmaq olar.
      if (data.session) {
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
          setMessage(
            "Hesab yaradıldı, amma profil cədvəlinə yazılmadı. Login edəndə yenidən yoxlanacaq."
          );
          // Yenə də login səhifəsinə göndərək
          setTimeout(() => router.push("/handyman/login"), 1500);
          return;
        }

        setMessage("Uğurlu! Profil yaradıldı. Login səhifəsinə yönləndirirəm...");
        setTimeout(() => router.push("/handyman/login"), 1200);
        return;
      }

      // ✅ Email confirmation ON olduqda session olmur.
      // Bu halda profil insert-i RLS səbəbindən client-dən çox vaxt alınmır.
      setMessage(
        "Uğurlu! Zəhmət olmasa emailini təsdiqlə (inbox/spam yoxla). Təsdiqdən sonra login et — profil avtomatik tamamlanacaq."
      );
      setTimeout(() => router.push("/handyman/login"), 2500);
    } catch (err: any) {
      setMessage(err?.message ?? "Xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        Handyman Signup
      </h1>

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