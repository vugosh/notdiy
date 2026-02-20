"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";


type Job = {
  id: string;
  title: string;
  description: string;
  zip: string;
  media_urls: string[];
  created_at: string;
};

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i.test(url);
}

export default function RepairJobDetailPage() {
  const params = useParams();

  // Next.js params bəzən string | string[] ola bilir — təhlükəsiz edək
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    if (!raw) return "";
    return Array.isArray(raw) ? String(raw[0]) : String(raw);
  }, [params]);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      // id yoxdursa, “Loading”də ilişmə
      if (!id) {
        setJob(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.rpc("get_public_job", {
        job_id: id,
      });

      if (cancelled) return;

      if (error) {
        console.error("get_public_job error:", error);
        setJob(null);
      } else {
        setJob((data as Job) || null);
      }

      setLoading(false);
    }

    loadJob();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;
  if (!job) return <p style={{ padding: 24 }}>Job not found.</p>;

  const postedText = job.created_at
    ? new Date(job.created_at).toLocaleString()
    : "";

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/repair-jobs" style={{ color: "#ff8c2b", fontWeight: 600, textDecoration: "none" }}>
        ← Back to Repair Jobs
      </Link>

      <h1 style={{ fontSize: 28, marginTop: 14 }}>{job.title}</h1>

      <p style={{ color: "#666", marginTop: 6 }}>
        ZIP: {job.zip}
        {postedText ? ` • Posted: ${postedText}` : ""}
      </p>

      <p style={{ marginTop: 14, fontSize: 16 }}>{job.description}</p>

      {job.media_urls?.length ? (
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {job.media_urls.map((url) => (
            <div
              key={url}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 10,
              }}
            >
              {isVideoUrl(url) ? (
                <video
                  src={url}
                  controls
                  style={{ width: "100%", maxHeight: 500, borderRadius: 6 }}
                />
              ) : (
                <img
                  src={url}
                  alt="job media"
                  style={{
                    width: "100%",
                    maxHeight: 500,
                    objectFit: "contain",
                    borderRadius: 6,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      <button
        style={{
          marginTop: 20,
          padding: "12px 18px",
          background: "#ff8c2b",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
        }}
        onClick={() => alert("Next step: handyman offer form")}
      >
        Submit an offer
      </button>
    </main>
  );
}
