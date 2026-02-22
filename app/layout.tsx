import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        {/* HEADER */}
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderBottom: "1px solid #eee",
            padding: "14px 24px",
            paddingTop: "calc(14px + env(safe-area-inset-top))",
            zIndex: 50,
          }}
        >
          <nav
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* LOGO (həmişə solda qalır) */}
            <a href="/" style={{ display: "inline-block", flex: "0 0 auto" }}>
              <img
                src="/notdiy-logo.png"
                alt="notDIY"
                style={{
                  height: "30px",
                  cursor: "pointer",
                  display: "block",
                }}
              />
            </a>

            {/* MENU (həmişə sağa yapışır, sığmasa alt sətirə düşür) */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "flex-start",
                gap: "10px",
                flex: "1 1 auto",
                minWidth: "240px",
              }}
            >
              <a
                href="#how-it-works"
                style={{ textDecoration: "none", color: "#000" }}
              >
                <button style={menuBtn}>How it works</button>
              </a>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Link
                  href="/handyman/signup"
                  style={{ textDecoration: "none", color: "#000" }}
                >
                  <button style={menuBtn}>Become a Handyman</button>
                </Link>

                <Link
                  href="/handyman/login"
                  style={{ textDecoration: "none", color: "#000" }}
                >
                  <button style={menuBtn}>Handyman Login</button>
                </Link>
              </div>
            </div>
          </nav>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ paddingTop: "120px" }}>{children}</main>
      </body>
    </html>
  );
}

const menuBtn: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #000",
  background: "#fff",
  cursor: "pointer",
  color: "#000",
  textDecoration: "none",
  WebkitAppearance: "none",
  appearance: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const ctaBtn: React.CSSProperties = {
  padding: "8px 16px",
  border: "2px solid #000",
  background: "#000",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};