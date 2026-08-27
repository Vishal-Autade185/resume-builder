/**
 * Version dropdown - sits in the header. Top-bar trigger (current label or
 * "Live edit") that opens a panel of saved versions with load / duplicate /
 * delete actions, plus a "Save as version..." entry.
 *
 * Phase 1 scope: UI only - no per-item include/exclude yet. Every save uses
 * the all-on selection (which is what the api treats as the default when no
 * selection is supplied). When we add checkboxes in a later batch, this
 * dropdown stays the same; only the selection passed to save changes.
 */
"use client";
import { useEffect, useRef, useState } from "react";

export type VersionSummary = {
  id: string;
  label: string;
  pdfStoragePath: string | null;
  pageCount: number | null;
  createdAt: string;
};

type Props = {
  currentLabel: string | null;
  versions: VersionSummary[];
  loading: boolean;
  saving: boolean;
  onSave: (label: string) => Promise<void>;
  onLoad: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClear: () => void;
};

export function VersionDropdown({
  currentLabel,
  versions,
  loading,
  saving,
  onSave,
  onLoad,
  onDuplicate,
  onDelete,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSavePrompt(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function handleSave() {
    const trimmed = draftLabel.trim();
    if (!trimmed) return;
    await onSave(trimmed);
    setDraftLabel("");
    setShowSavePrompt(false);
    setOpen(false);
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        style={{
          background: currentLabel ? "#1f3a5f" : "#222",
          color: "white",
          border: "1px solid #444",
          borderRadius: 4,
          padding: "0.4rem 0.8rem",
          fontSize: 14,
          cursor: loading ? "wait" : "pointer",
          minWidth: 220,
          textAlign: "left",
        }}
        title={currentLabel ?? "Live edit"}
      >
        {loading ? "loading..." : (currentLabel ?? "Live edit")}
        <span style={{ float: "right", opacity: 0.6 }}>
          {currentLabel ? "✎" : "▾"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "white",
            color: "#1a1a1a",
            border: "1px solid #ccc",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            minWidth: 320,
            maxHeight: 480,
            overflow: "auto",
            zIndex: 100,
          }}
        >
          {currentLabel && (
            <button
              onClick={() => { onClear(); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "#f5f5f5", border: "none", borderBottom: "1px solid #eee",
                padding: "0.6rem 0.8rem", cursor: "pointer", fontSize: 13,
              }}
            >
              ← Back to live edit
            </button>
          )}

          <div style={{ padding: "0.6rem 0.8rem", borderBottom: "1px solid #eee" }}>
            {showSavePrompt ? (
              <div>
                <input
                  autoFocus
                  placeholder="version label, e.g. Google SWE Intern 2026-08"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setShowSavePrompt(false);
                  }}
                  style={{
                    width: "100%", padding: "0.4rem 0.6rem",
                    border: "1px solid #ccc", borderRadius: 4, fontSize: 13,
                  }}
                />
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <button
                    onClick={handleSave}
                    disabled={saving || !draftLabel.trim()}
                    style={{
                      padding: "0.3rem 0.6rem", fontSize: 12,
                      background: saving ? "#888" : "#1f3a5f",
                      color: "white", border: "none", borderRadius: 4,
                      cursor: saving ? "wait" : "pointer",
                    }}
                  >
                    {saving ? "saving..." : "save"}
                  </button>
                  <button
                    onClick={() => { setShowSavePrompt(false); setDraftLabel(""); }}
                    style={{
                      padding: "0.3rem 0.6rem", fontSize: 12,
                      background: "transparent", border: "1px solid #ccc",
                      borderRadius: 4, cursor: "pointer",
                    }}
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSavePrompt(true)}
                style={{
                  width: "100%", padding: "0.4rem 0.6rem",
                  background: "#1f3a5f", color: "white",
                  border: "none", borderRadius: 4, fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Save current as version
              </button>
            )}
          </div>

          <div style={{ padding: "0.4rem 0", maxHeight: 320, overflow: "auto" }}>
            {versions.length === 0 ? (
              <div style={{ padding: "0.6rem 0.8rem", color: "#888", fontSize: 13 }}>
                No versions saved yet.
              </div>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "0.4rem 0.6rem",
                    borderBottom: "1px solid #f0f0f0",
                    gap: 6,
                  }}
                >
                  <button
                    onClick={() => { onLoad(v.id); setOpen(false); }}
                    title={new Date(v.createdAt).toLocaleString()}
                    style={{
                      flex: 1, textAlign: "left",
                      background: currentLabel === v.label ? "#eef4fb" : "transparent",
                      border: "none", padding: "0.2rem 0.4rem",
                      borderRadius: 3, cursor: "pointer", fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: currentLabel === v.label ? 600 : 400 }}>
                      {v.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {new Date(v.createdAt).toLocaleString()}
                      {v.pdfStoragePath ? "" : " (no pdf)"}
                      {v.pageCount !== null && v.pageCount !== undefined &&
                        (v.pageCount === 1
                          ? " · 1 page"
                          : ` · ${v.pageCount} pages`)}{" "}
                      {v.pageCount !== null && v.pageCount !== undefined && v.pageCount > 1 && (
                        <span style={{
                          marginLeft: 4, fontSize: 10, color: "#a60",
                          fontWeight: 600,
                        }}>
                          ⚠ overflow
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => onDuplicate(v.id)}
                    title="Duplicate this version as a new starting point"
                    style={{
                      background: "transparent", border: "1px solid #ccc",
                      borderRadius: 3, padding: "0.2rem 0.4rem",
                      fontSize: 11, cursor: "pointer",
                    }}
                  >
                    dup
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete version "${v.label}"?`)) onDelete(v.id);
                    }}
                    title="Delete this version and its stored PDF"
                    style={{
                      background: "transparent", border: "1px solid #cbb",
                      borderRadius: 3, padding: "0.2rem 0.4rem",
                      fontSize: 11, cursor: "pointer", color: "#a33",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}