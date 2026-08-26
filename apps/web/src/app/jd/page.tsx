/**
 * /jd - list stored job descriptions + create a new one.
 *
 * Three creation paths per product.md section 2.3:
 *   1. paste raw text
 *   2. upload .pdf (server parses)
 *   3. upload .docx (server parses)
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type JdSummary = {
  id: string;
  source: "text" | "pdf" | "docx";
  sourceName: string | null;
  createdAt: string;
  warnings: string[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 2,
};

const cardStyle: React.CSSProperties = {
  background: "white", padding: "1rem", borderRadius: 6, marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function JdIndexPage() {
  const [jds, setJds] = useState<JdSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    const res = await fetch("/api/jd");
    const body = await res.json();
    setJds(body.data ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function createFromText() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), sourceName: sourceName || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `failed (${res.status})`);
      }
      const body = await res.json();
      window.location.href = `/jd/${body.data.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function createFromFile(file: File) {
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/jd", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `failed (${res.status})`);
      }
      const body = await res.json();
      window.location.href = `/jd/${body.data.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Job descriptions</h1>
        <nav style={{ fontSize: 13 }}>
          <Link href="/" style={{ color: "#1f3a5f", marginRight: 12 }}>data bank</Link>
          <Link href="/settings" style={{ color: "#1f3a5f" }}>settings</Link>
        </nav>
      </header>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Add a JD</h3>
          <button onClick={() => setShowCreate((v) => !v)} style={{ padding: "0.4rem 0.8rem", fontSize: 13 }}>
            {showCreate ? "hide" : "+ add"}
          </button>
        </div>
        {showCreate && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Source name (optional)</label>
              <input style={inputStyle} value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Google SWE Intern JD" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Paste JD text</label>
              <textarea style={{ ...inputStyle, minHeight: 100, fontFamily: "monospace" }}
                value={text} onChange={(e) => setText(e.target.value)} />
              <button disabled={submitting || !text.trim()} onClick={createFromText}
                style={{ marginTop: 6, padding: "0.4rem 0.8rem", fontSize: 13 }}>
                {submitting ? "saving..." : "save as text"}
              </button>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
              <label style={labelStyle}>Or upload .pdf / .docx</label>
              <input type="file" accept=".pdf,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) createFromFile(f);
                }}
                disabled={submitting}
                style={{ fontSize: 13 }} />
              {submitting && <p style={{ color: "#666", fontSize: 12 }}>parsing + uploading...</p>}
            </div>
            {error && (
              <div style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{error}</div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ margin: "1rem 0 0.5rem" }}>Stored</h3>
        {loading ? (
          <p style={{ color: "#666" }}>loading...</p>
        ) : jds.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13 }}>No JDs stored yet.</p>
        ) : (
          jds.map((j) => (
            <Link key={j.id} href={`/jd/${j.id}`}
              style={{ display: "block", ...cardStyle, color: "#1a1a1a", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {j.sourceName ?? `Untitled ${j.source} jd`}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {j.source.toUpperCase()} · {new Date(j.createdAt).toLocaleString()}
                  </div>
                  {j.warnings.length > 0 && (
                    <div style={{ fontSize: 12, color: "#a60", marginTop: 2 }}>
                      ⚠ {j.warnings[0]}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#1f3a5f" }}>open →</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}