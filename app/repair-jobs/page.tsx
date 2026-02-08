"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  description: string;
  zip: string;
  media_urls: string[];
  created_at: string;
};

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v|ogg)$/i.test(url);
}

export default function RepairJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_public_jobs");

      if (error) {
        console.error("get_public_jobs error:", error);
        setJobs([]);
      } else {
        setJobs((data as Job[]) || []);
      }

      setLoading(false);
    }

    loadJobs();
  }, []);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading repair jobs...</p>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Available Repair Jobs</h1>

      {jobs.length === 0 && <p>No jobs available.</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {jobs.map((job) => {
          const firstMedia = job.media_urls?.[0];

          return (
            <div
              key={job.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h2 style={{ fontSize: 18 }}>{job.title}</h2>

              <p style={{ color: "#555", margin: "8px 0" }}>{job.description}</p>

              <p style={{ fontSize: 13 }}>ZIP: {job.zip}</p>

              {firstMedia ? (
                isVideoUrl(firstMedia) ? (
                  <video
                    src={firstMedia}
                    controls
                    style={{
                      marginTop: 10,
                      width: "100%",
                      maxHeight: 320,
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <img
                    src={firstMedia}
                    alt="job media"
                    style={{
                      marginTop: 10,
                      maxWidth: "100%",
                      borderRadius: 6,
                    }}
                  />
                )
              ) : null}

              <Link
                href={`/repair-jobs/${job.id}`}
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  color: "#ff8c2b",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View details →
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
