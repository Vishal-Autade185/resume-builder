import { DataBankForm } from "./_components/DataBankForm";

export default function HomePage() {
  return (
    <main style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{
        background: "#1a1a1a", color: "white",
        padding: "0.75rem 1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{ margin: 0, fontSize: "1.1rem" }}>Resume Builder</h1>
        <nav style={{ fontSize: 13 }}>
          <a href="/settings" style={{ color: "#9bc" }}>settings</a>
        </nav>
      </header>
      <DataBankForm />
    </main>
  );
}
