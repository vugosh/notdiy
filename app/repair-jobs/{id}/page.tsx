"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  description: string;
  zip: string;
  media_urls: string[];
  created_at: string;
};

export default function RepairJobDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJob() {
      if (!id) return;

      const { data, error } = await supabase.rpc("get_public_job", {
        job_id: id,
      });

      if (error) {
        console.error(error);
      } else {
        setJob(data || null);
      }
      setLoading(false);
    }

    loadJob();
  }, [id]);

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;
  if (!job) return <p style={{ padding: 24 }}>Job not found.</p>;

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <Link href="/repair-jobs" style={{ color: "#ff8c2b", fontWeight: 600 }}>
        ← Back to Repair Jobs
      </Link>

      <h1 style={{ fontSize: 28, marginTop: 14 }}>{job.title}</h1>
      <p style={{ color: "#666", marginTop: 6 }}>
        ZIP: {job.zip} • Posted: {new Date(job.created_at).toLocaleString()}
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
              {/* sadə: video URL-lər də ola bilər */}
              {url.match(/\.(mp4|mov|webm)(\?|$)/i) ? (
                <video
                  src={url}
                  controls
                  style={{ width: "100%", maxHeight: 500, borderRadius: 6 }}
                />
              ) : (
                <img
                  src={url}
                  alt="job media"
                  style={{ width: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 6 }}
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
