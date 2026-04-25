export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        background: "#0f172a",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
        🚀 Smart AI Civic Intelligence Platform
      </h1>

      <p style={{ marginBottom: "30px", opacity: 0.8 }}>
        Choose your portal to continue
      </p>

      <div style={{ display: "flex", gap: "20px" }}>
        <a href="/citizen" style={btnStyle}>Citizen Portal</a>
        <a href="/employee" style={btnStyle}>Employee Portal</a>
        <a href="/admin" style={btnStyle}>Admin Portal</a>
      </div>
    </main>
  );
}

const btnStyle = {
  padding: "12px 20px",
  background: "#2563eb",
  borderRadius: "8px",
  color: "white",
  textDecoration: "none",
  fontWeight: "500",
};
