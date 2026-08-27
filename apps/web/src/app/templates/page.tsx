/**
 * /templates - list stored resume templates + upload a new one.
 *
 * Templates are user-uploaded .zip files containing a LaTeX template
 * (typically main.tex). On upload, we auto-detect which data-bank
 * fields the template expects and show the user a sidebar with the
 * detected structure.
 *
 * Template upload requires a .zip with a .tex inside. The first .tex
 * file is used.
 */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TemplateSummary } from "@resume-builder/shared";

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: "1rem",
  borderRadius: 6,
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "inherit",
};

export default function TemplatesIndexPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const res = await fetch("/api/templates");
    const body = await res.json();
    setTemplates(body.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (name.trim()) form.append("name", name.trim());
      const res = await fetch("/api/templates", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `upload failed (${res.status})`);
      }
      const body = await res.json();
      window.location.href = `/templates/${body.data.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function removeTemplate(id: string, label: string) {
    if (!confirm(`Delete template "${label}"? Versions using it keep their pdf.`)) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <h1 style={{ margin: 0 }}>Resume templates</h1>
        <nav style={{ fontSize: 13, display: "flex", gap: 16 }}>
          <Link href="/" style={{ color: "#9bc" }}>data bank</Link>
          <Link href="/jd" style={{ color: "#9bc" }}>job descriptions</Link>
          <Link href="/settings" style={{ color: "#9bc" }}>settings</Link>
        </nav>
      </header>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Upload a template</h3>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ padding: "0.4rem 0.8rem", fontSize: 13 }}
          >
            {showForm ? "hide" : "+ upload"}
          </button>
        </div>
        {showForm && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>
              Upload a <code>.zip</code> containing <code>main.tex</code>.
              We auto-detect which data-bank fields the template expects.
            </p>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 2 }}>
                Template name (optional, defaults to zip filename)
              </label>
              <input
                style={{ ...inputStyle, width: "100%" }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jake's Resume — Letter"
              />
            </div>
            <input
              type="file"
              accept=".zip"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
              }}
              style={{ fontSize: 13 }}
            />
            {uploading && (
              <p style={{ color: "#666", fontSize: 12 }}>parsing + uploading...</p>
            )}
            {error && (
              <div style={{
                color: "#b00020",
                fontSize: 13,
                marginTop: 8,
                padding: "0.5rem 0.75rem",
                background: "#fff5f5",
                border: "1px solid #ebb",
                borderRadius: 4,
              }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <h3 style={{ margin: "1rem 0 0.5rem" }}>Stored</h3>
      {loading ? (
        <p style={{ color: "#666" }}>loading...</p>
      ) : templates.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>No templates yet.</p>
      ) : (
        templates.map((t) => {
          const hasIncompatibleMacros =
            (t.detectedFields as unknown as { pdftexOnlyMacros?: string[] })
              .pdftexOnlyMacros &&
            (t.detectedFields as unknown as { pdftexOnlyMacros: string[] })
              .pdftexOnlyMacros.length > 0;
          return (
            <div
              key={t.id}
              style={{
                ...cardStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <Link
                  href={`/templates/${t.id}`}
                  style={{
                    fontWeight: 600,
                    color: "#1a1a1a",
                    textDecoration: "none",
                    fontSize: 15,
                  }}
                >
                  {t.name}
                </Link>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  {new Date(t.createdAt).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>
                  {t.detectedFields.sections.map((s) => (
                    <span
                      key={s.kind + s.heading}
                      style={{
                        display: "inline-block",
                        padding: "1px 6px",
                        margin: "0 4px 0 0",
                        borderRadius: 3,
                        background: "#eef4fb",
                        border: "1px solid #cce",
                      }}
                    >
                      {s.kind} × {s.count}
                    </span>
                  ))}
                </div>
                {hasIncompatibleMacros && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "#a60",
                  }}>
                    ⚠ uses pdftex-only macros (won't compile under xetex)
                  </div>
                )}
              </div>
              <button
                onClick={() => removeTemplate(t.id, t.name)}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: 12,
                  background: "white",
                  color: "#b00020",
                  border: "1px solid #ebb",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                delete
              </button>
            </div>
          );
        })
      )}
    </main>
  );
}