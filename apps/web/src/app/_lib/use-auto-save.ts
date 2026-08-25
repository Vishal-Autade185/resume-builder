/**
 * Auto-save hook for the data bank form. Debounces 600ms after the last
 * change, then PUTs the full DataBank to /api/data-bank. Phase 0: last-
 * write-wins, no merge UI. Two-tab conflict is handled by a "saved at"\n * indicator.
 */"use client";
import { useEffect, useRef, useState } from "react";
import type { DataBank } from "@resume-builder/shared";

export function useAutoSave(data: DataBank, enabled: boolean = true) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(data);

  useEffect(() => {
    latest.current = data;
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/data-bank", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(latest.current),
        });
        if (!res.ok) throw new Error(`PUT ${res.status}`);
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch {
        setStatus("error");
      }
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, enabled]);

  return { status, lastSavedAt };
}
