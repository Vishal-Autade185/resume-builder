/**
 * /templates/[id] - single template view.
 *
 * Shows what the parser detected (which data-bank fields the template
 * expects, how many of each, any pdftex-only macro warnings), and lets
 * the user create a version from this template using the current data
 * bank. The actual rendering happens server-side via /api/versions.
 */
"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { TemplateDetail } from "@resume-builder/shared";

type PdftexWarning = { macros: string[] };

export default function TemplateDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/templates/${id}`);
      if (cancelled) return;
      if (res.ok) {
        const body = await res.json();
        setTemplate(body.data);
      } else {
        setError(`template not found (${res.status})`);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function deleteTemplate() {
    if (!template) return;
    if (!confirm(`Delete template "${template.name}"?`)) return;
    const res = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/templates";
    else setError("delete failed");
  }

  async function createVersion() {
    if (!template) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: `${template.name} — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
          templateId: template.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `save failed (${res.status})`);
      }
      const body = await res.json();
      window.location.href = `/versions/${body.data.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  if (loading || !template) {
    return (
      <main style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
        <p style={{ color: "#666" }}>{error ?? "loading..."}</p>
      </main>
    );
  }

  const pdftexMacros = (template.detectedFields as unknown as {
    pdftexOnlyMacros?: string[];
  }).pdftexOnlyMacros ?? [];

  return (
    <main style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <Link href="/templates" style={{ fontSize: 13, color: "#1f3a5f" }}>
          ← all templates
        </Link>
        <h1 style={{ margin: "0.5rem 0 0" }}>{template.name}</h1>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          uploaded {new Date(template.createdAt).toLocaleString()}
        </div>
      </header>

      <section
        style={{
          background: "white",
          padding: "1rem",
          borderRadius: 6,
          marginBottom: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem" }}>Detected structure</h3>
        <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>
          We parsed the template and counted the repeating elements it
          expects. Each chip below is one data-bank field; the number
          is how many entries the template can hold.
        </p>
        <div style={{ marginTop: 8 }}>
          {template.detectedFields.sections.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>
              No structured sections detected. The template may use plain
              text only (no jake's-resume macros).
            </p>
          ) : (
            template.detectedFields.sections.map((s) => (
              <div
                key={s.kind + (s.heading ?? "")}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                  fontSize: 14,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{s.kind}</span>
                  {s.heading && (
                    <span style={{ color: "#888", marginLeft: 8 }}>
                      ({s.heading})
                    </span>
                  )}
                </div>
                <div>
                  <span style={{
                    background: "#eef4fb",
                    border: "1px solid #cce",
                    borderRadius: 3,
                    padding: "1px 8px",
                    fontSize: 12,
                  }}>
                    {s.count} entr{s.count === 1 ? "y" : "ies"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {pdftexMacros.length > 0 && (
        <section
          style={{
            background: "#fff5f5",
            padding: "1rem",
            borderRadius: 6,
            marginBottom: "1rem",
            border: "1px solid #ebb",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem", color: "#a60" }}>
            ⚠ PDFTeX-only macros detected
          </h3>
          <p style={{ color: "#a60", fontSize: 13, marginTop: 0 }}>
            These macros only work under pdftex, not xetex (which we
            use for compilation). Compiling this template as-is will
            fail. Edit the template to remove these lines:
          </p>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {pdftexMacros.map((m: string) => (
              <li key={m} style={{ fontFamily: "monospace", fontSize: 13 }}>
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        style={{
          background: "white",
          padding: "1rem",
          borderRadius: 6,
          marginBottom: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem" }}>Create version from this template</h3>
        <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>
          Saves the current data bank as a version using this template.
          The version's pdf is rendered server-side; if the template has
          incompatibilities (above), the compile will fail with a clear
          error.
        </p>
        <button
          onClick={createVersion}
          disabled={creating}
          style={{
            padding: "0.5rem 1rem",
            fontSize: 14,
            background: creating ? "#888" : "#1f3a5f",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: creating ? "wait" : "pointer",
          }}
        >
          {creating ? "rendering..." : "Create version"}
        </button>
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
      </section>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button
          onClick={deleteTemplate}
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: 13,
            background: "white",
            color: "#b00020",
            border: "1px solid #ebb",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Delete template
        </button>
      </div>
    </main>
  );
}