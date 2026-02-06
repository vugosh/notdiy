export default function RequestLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div>
        {/* Request page üçün sadə header: yalnız logo */}
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
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <a href="/" style={{ display: "inline-block" }}>
              <img
                src="/notdiy-logo.png"
                alt="notDIY"
                style={{ height: "30px", cursor: "pointer" }}
              />
            </a>
          </div>
        </header>
  
        {/* content aşağı düşsün */}
        <main style={{ paddingTop: "20px" }}>{children}</main>
      </div>
    );
  }
  