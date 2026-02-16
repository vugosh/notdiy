export default function Home() {
  return (
    <main
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        padding: "120px 24px 80px",
        textAlign: "center",
        gap: "80px",
      }}
    >
      {/* HERO */}
      <div style={{ maxWidth: "600px", width: "100%" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "12px" }}>
          notDIY
        </h1>

        <p style={{ fontSize: "18px", marginBottom: "32px" }}>
          Hire a local Handyman for small repairs.
        </p>

        {/* PRIMARY ACTIONS */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/request"
            style={{
              padding: "15px 24px",
              background: "#000",
              color: "#ff4D00",
              fontSize: "20px",
              fontWeight: 700,
              textDecoration: "none",
              borderRadius: 6,
              display: "inline-block",
            }}
          >
            Request a Handyman
          </a>

          <span
            style={{
              fontSize: "14px",
              color: "#666",
              fontWeight: 600,
            }}
          >
            or
          </span>

          <a
            href="/track"
            style={{
              padding: "15px 24px",
              background: "#fff",
              color: "#000",
              border: "1px solid #000",
              fontSize: "20px",
              fontWeight: 700,
              textDecoration: "none",
              borderRadius: 6,
              display: "inline-block",
            }}
          >
            Track your survey
          </a>
        </div>

        <p style={{ marginTop: "12px", fontSize: "14px", color: "#555" }}>
          Tell us what needs fixing at your home.
        </p>

        <div
          id="request"
          style={{ marginTop: "120px", scrollMarginTop: "120px" }}
        />
      </div>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{
          maxWidth: "600px",
          width: "100%",
          padding: "30px 0",
          scrollMarginTop: "80px",
        }}
      >
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>
          How it works
        </h2>

        <div style={{ display: "grid", gap: "20px" }}>
          <div>
            🔧 <strong>Submit a repair request</strong>
            <p>Describe the problem and upload photos or videos.</p>
          </div>

          <div>
            💬 <strong>Get up to 5 local offers</strong>
            <p>Local handymen send you their price offers.</p>
          </div>

          <div>
            ✅ <strong>Choose the best offer</strong>
            <p>Select the handyman that fits your needs.</p>
          </div>

          <div>
            🛠️ <strong>Get it fixed</strong>
            <p>The handyman completes the repair.</p>
          </div>

          <div>
            💰 <strong>Pay the handyman directly</strong>
            <p>Pay after the job is done.</p>
          </div>
        </div>
      </section>

      {/* BECOME A HANDYMAN */}
      <section
        id="become-handyman"
        style={{
          maxWidth: "900px",
          width: "100%",
          padding: "80px 0",
          scrollMarginTop: "120px",
        }}
      >
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>
          Become a Handyman
        </h2>

        <p style={{ fontSize: "18px", lineHeight: 1.6 }}>
          Get local repair jobs. Work on your schedule. Get paid per task.
        </p>
      </section>
    </main>
  );
}
