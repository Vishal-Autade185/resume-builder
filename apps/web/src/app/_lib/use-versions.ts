/**
 * useVersions - manages the list of saved versions + the currently-loaded
 * one. Phase 1 UI only: selection is all-on at save time, so versions mainly
 * carry (label + data bank snapshot + template id). Selection-aware save
 * (per-item include/exclude) wires up later without API changes.
 *
 * "Editing" state lives in DataBankForm. This hook owns:
 *   - the list of summaries (label, createdAt, pdfStoragePath)
 *   - the id+label of the currently-loaded version (null = live edit)
 *   - the save / load / duplicate / delete actions
 *
 * It does NOT own the data bank form state - on load, it returns the
 * snapshot to the caller and the caller is responsible for setting it.
 */
"use client";
import { useCallback, useEffect, useState } from "react";
import type { DataBank } from "@resume-builder/shared";

export type VersionSummary = {
  id: string;
  label: string;
  pdfStoragePath: string | null;
  createdAt: string;
};

export type VersionDetail = {
  id: string;
  label: string;
  dataBankSnapshot: DataBank;
  selection: Record<string, unknown>;
  templateId: string | null;
  styleSettings: Record<string, unknown>;
  pdfStoragePath: string | null;
  createdAt: string;
};

export function useVersions() {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [currentVersionLabel, setCurrentVersionLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initial load: list of versions.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/versions");
      if (!res.ok) return;
      const body = await res.json();
      setVersions(body.data ?? []);
    } catch {
      // silent - non-fatal if list fails; user can retry by saving
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Save current form state as a new version.
  const save = useCallback(
    async (
      label: string,
      selection: Record<string, unknown> = {},
    ): Promise<{ ok: true; version: VersionDetail } | { ok: false; error: string }> => {
      setSaving(true);
      try {
        const res = await fetch("/api/versions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label, selection }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, error: body.error ?? `save failed (${res.status})` };
        }
        const body = await res.json();
        await refresh();
        return { ok: true, version: body.data };
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  // Load a version: fetch its full detail, return to caller.
  const load = useCallback(
    async (id: string): Promise<VersionDetail | null> => {
      try {
        const res = await fetch(`/api/versions/${id}`);
        if (!res.ok) return null;
        const body = await res.json();
        setCurrentVersionLabel(body.data.label);
        return body.data;
      } catch {
        return null;
      }
    },
    [],
  );

  // Duplicate a version: load it, change label, save as new. The caller
  // is responsible for setting the new label hint.
  const duplicate = useCallback(
    async (id: string): Promise<VersionDetail | null> => {
      // load gives us the snapshot
      const detail = await load(id);
      if (!detail) return null;
      const newLabel = `${detail.label} (copy)`;
      const res = await fetch("/api/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: newLabel,
          selection: detail.selection ?? {},
        }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      await refresh();
      setCurrentVersionLabel(body.data.label);
      return body.data;
    },
    [load, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/versions/${id}`, { method: "DELETE" });
        if (!res.ok) return false;
        await refresh();
        // If we were viewing the deleted version, drop back to live edit.
        setCurrentVersionLabel((prev) => {
          // Caller is responsible for resetting its form state; we just
          // indicate the version is gone. (The caller will call clear().)
          return prev;
        });
        return true;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  const clear = useCallback(() => {
    setCurrentVersionLabel(null);
  }, []);

  return {
    versions,
    currentVersionLabel,
    loading,
    saving,
    save,
    load,
    duplicate,
    remove,
    clear,
    refresh,
  };
}