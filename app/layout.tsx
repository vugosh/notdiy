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
            zIndex: 50,
          }}
        >
          <nav
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 20px",
    gap: "16px",
    flexWrap: "wrap",
  }}
>
            {/* LOGO */}
<a href="/" style={{ display: "inline-block" }}>
  <img
    src="/notdiy-logo.png"
    alt="notDIY"
    style={{
      height: "30px",
      cursor: "pointer",
    }}
  />
</a>


            {/* MENU BUTTONS */}
            <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    marginLeft: "auto",
    paddingTop: "4px",
  }}
>
  <a href="#how-it-works" style={{ textDecoration: "none" }}>
    <button style={menuBtn}>How it works</button>
  </a>

  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <Link href="/handyman/signup" style={{ textDecoration: "none" }}>
      <button style={menuBtn}>Become a Handyman</button>
    </Link>

    <Link href="/handyman/login" style={{ textDecoration: "none" }}>
      <button style={menuBtn}>Handyman Login</button>
    </Link>
  </div>
</div>
          </nav>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ paddingTop: "120px" }}>
          {children}
        </main>

      </body>
    </html>
  );
}

const menuBtn = {
  padding: "8px 14px",
  border: "1px solid #000",
  background: "#fff",
  cursor: "pointer",
  color: "#000",
  textDecoration: "none",
  WebkitAppearance: "none",
  appearance: "none",
};

const ctaBtn = {
  padding: "8px 16px",
  border: "2px solid #000",
  background: "#000",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
