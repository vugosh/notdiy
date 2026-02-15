"use client";

export const dynamic = "force-dynamic";

import { supabase } from "../lib/supabaseClient";
import {
  useMemo,
  useState,
  useEffect,
  type CSSProperties,
  type FormEvent,
  type ChangeEvent,
} from "react";

export default function RequestPage() {
  const ORANGE = "#ff8c2b";

  // FILE LIMITS (per file)
  const MAX_MB = 50;
  const MAX_BYTES = MAX_MB * 1024 * 1024;

  // STORAGE BUCKET
  const BUCKET = "request-media";

  // MEDIA STATE (photo+video together)
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState<string>("");

  // UI STATE
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadNote, setUploadNote] = useState<string>("");

  function handleMediaChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setMediaError("");
    setUploadNote("");

    if (!files.length) {
      setMediaFiles([]);
      return;
    }

    for (const f of files) {
      const okType = f.type.startsWith("image/") || f.type.startsWith("video/");
      if (!okType) {
        setMediaError("Yalnız şəkil və video fayllar qəbul olunur.");
        e.target.value = "";
        setMediaFiles([]);
        return;
      }
      if (f.size > MAX_BYTES) {
        setMediaError(
          `Fayl çox böyükdür: ${f.name}. Maksimum ${MAX_MB}MB (hər fayl üçün).`
        );
        e.target.value = "";
        setMediaFiles([]);
        return;
      }
    }

    setMediaFiles(files);
  }

  // PREVIEWS
  const previews = useMemo(() => {
    return mediaFiles.map((f) => ({
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
  }, [mediaFiles]);

  // cleanup preview urls
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  function safeFileName(name: string) {
    // very simple sanitize
    return name.replace(/[^\w.\-]+/g, "_");
  }

  function makeId() {
    // folder id for storage paths
    try {
      // modern browsers
      return crypto.randomUUID();
    } catch {
      // fallback
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;

    if (mediaFiles.length === 0) {
      setMediaError("You must upload at least one photo or video.");
      return;
    }
    if (mediaError) return;

    setIsSubmitting(true);
    setUploadNote("Uploading media...");

    try {
      const data = new FormData(form);

      // 1) Upload media to Storage
      const folderId = makeId(); // we'll store files under this folder
      const uploadedUrls: string[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        setUploadNote(`Uploading ${i + 1}/${mediaFiles.length}: ${file.name}`);

        const ext = file.name.includes(".")
          ? file.name.split(".").pop()
          : "";
        const base = safeFileName(file.name.replace(/\.[^/.]+$/, ""));
        const path = `${folderId}/${Date.now()}-${i}-${base}${ext ? "." + ext : ""}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upErr) {
          console.error("Upload error:", upErr);
          alert(`Upload error: ${file.name}`);
          setIsSubmitting(false);
          setUploadNote("");
          return;
        }

        const { data: pub } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);

        if (!pub?.publicUrl) {
          alert("Could not generate public URL for uploaded file.");
          setIsSubmitting(false);
          setUploadNote("");
          return;
        }

        uploadedUrls.push(pub.publicUrl);
      }

     // 2) Insert request into DB with media_urls already filled
setUploadNote("Saving request...");

const { data: inserted, error: insertErr } = await supabase
  .from("requests")
  .insert({
    first_name: String(data.get("firstName") ?? ""),
    last_name: String(data.get("lastName") ?? ""),
    email: String(data.get("email") ?? ""),
    phone: String(data.get("phone") ?? ""),
    address: String(data.get("address") ?? ""),
    zip: String(data.get("zip") ?? ""),
    title: String(data.get("title") ?? ""),
    description: String(data.get("description") ?? ""),
    media_urls: uploadedUrls,
    status: "new",
  })
  .select("id")
  .single();

if (insertErr) {
  console.error("Insert error:", insertErr);
  alert("Insert error. Check console.");
  setIsSubmitting(false);
  setUploadNote("");
  return;
}

const { data: tracking, error: trackingErr } = await supabase.rpc(
  "assign_tracking_code",
  { p_request_id: inserted.id }
);

if (trackingErr) {
  console.error("Tracking error:", trackingErr);
  alert("Tracking number error. Check console.");
  setIsSubmitting(false);
  setUploadNote("");
  return;
}

alert("Request submitted successfully!\nTracking number: " + tracking);


      form.reset();
      setMediaFiles([]);
      setMediaError("");
      setUploadNote("");
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      alert("Unexpected error. Check console.");
      setIsSubmitting(false);
      setUploadNote("");
    }
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid #cfcfcf",
    borderRadius: "6px",
    fontSize: "14px",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "13px",
    margin: "6px 0 6px",
    color: "#333",
    fontWeight: 600,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1px 24px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ maxWidth: "720px" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
          Post a Repair Issue
        </h1>
        <p style={{ marginBottom: "24px", color: "#555" }}>
          Fill out the details below. Uploading at least one photo/video is required.
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: "560px" }}>
          {/* CUSTOMER INFO */}
          <h2 style={{ fontSize: "18px", margin: "18px 0 10px" }}>
            Customer details
          </h2>

          <label style={labelStyle}>First name *</label>
          <input
            name="firstName"
            required
            placeholder="First name"
            style={inputStyle}
            disabled={isSubmitting}
          />

          <label style={labelStyle}>Last name *</label>
          <input
            name="lastName"
            required
            placeholder="Last name"
            style={inputStyle}
            disabled={isSubmitting}
          />

          <label style={labelStyle}>Email *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            style={inputStyle}
            disabled={isSubmitting}
          />

          <label style={labelStyle}>Phone number *</label>
          <input
            name="phone"
            type="tel"
            required
            placeholder="(xxx) xxx-xxxx"
            style={inputStyle}
            disabled={isSubmitting}
          />

          <label style={labelStyle}>Home address *</label>
          <input
            name="address"
            required
            placeholder="Street, City, State"
            style={inputStyle}
            disabled={isSubmitting}
          />

          <label style={labelStyle}>ZIP code *</label>
          <input
            name="zip"
            required
            placeholder="ZIP code"
            style={inputStyle}
            disabled={isSubmitting}
          />

          {/* ISSUE INFO */}
          <h2 style={{ fontSize: "18px", margin: "22px 0 10px" }}>
            Issue details
          </h2>

          <label style={labelStyle}>Short title *</label>
          <input
            name="title"
            required
            placeholder="Short title (e.g. Fix sink)"
            style={inputStyle}
            disabled={isSubmitting}
          />

          <label style={labelStyle}>Describe the issue *</label>
          <textarea
            name="description"
            required
            placeholder="Describe the issue"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
            disabled={isSubmitting}
          />

          {/* MEDIA */}
          <h2 style={{ fontSize: "18px", margin: "22px 0 10px" }}>
            Upload Photos and/or Videos *
          </h2>

          <label style={labelStyle}>
            Media (photos or videos, max {MAX_MB}MB per file) *
          </label>

          <input
            name="media"
            type="file"
            accept="image/*,video/*"
            multiple
            required
            style={{ marginBottom: "8px" }}
            onChange={handleMediaChange}
            disabled={isSubmitting}
          />

          {mediaError ? (
            <p style={{ color: "crimson", fontSize: 13, marginTop: 8 }}>
              {mediaError}
            </p>
          ) : null}

          {uploadNote ? (
            <p style={{ color: "#555", fontSize: 13, marginTop: 8 }}>
              {uploadNote}
            </p>
          ) : null}

          {previews.length ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
                Selected files: {previews.length}
              </p>

              <div style={{ display: "grid", gap: 12 }}>
                {previews.map((p) => (
                  <div
                    key={p.url}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 10,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
                      {p.name}
                    </div>

                    {p.type.startsWith("image/") ? (
                      <img
                        src={p.url}
                        alt={p.name}
                        style={{
                          width: "100%",
                          maxHeight: 260,
                          objectFit: "contain",
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      <video
                        src={p.url}
                        controls
                        style={{
                          width: "100%",
                          maxHeight: 260,
                          borderRadius: 6,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#777", marginTop: 8 }}>
              You must upload at least one photo or video.
            </p>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "16px",
              padding: "14px 24px",
              backgroundColor: ORANGE,
              opacity: isSubmitting ? 0.7 : 1,
              color: "#fff",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Issue"}
          </button>
        </form>
      </div>
    </main>
  );
}
