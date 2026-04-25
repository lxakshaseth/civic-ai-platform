export default function Home() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>🚀 Smart AI Civic Intelligence Platform</h1>

      <p>Select Portal:</p>

      <div style={{ marginTop: "20px" }}>
        <a href="/citizen">Citizen</a> |{" "}
        <a href="/employee">Employee</a> |{" "}
        <a href="/admin">Admin</a>
      </div>
    </div>
  );
}
