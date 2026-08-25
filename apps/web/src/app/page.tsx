import { DataBankForm } from "./_components/DataBankForm";

export default function HomePage() {
  return (
    <main style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <header style={{ background: "#1a1a1a", color: "white", padding: "0.75rem 1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.1rem" }}>Resume Builder — Phase 0</h1>
      </header>
      <DataBankForm />
    </main>
  );
}
