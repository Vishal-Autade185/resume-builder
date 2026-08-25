/**
 * Live preview hook. Debounces 800ms after the last data-bank change, asks
 * /api/compile to render the current data bank's .tex, returns a blob url
 * for the resulting PDF.
 */
"use client";
import { useEffect, useRef, useState } from "react";
import type { DataBank } from "@resume-builder/shared";
import { renderDataBankToLatex } from "@/lib/render-latex";

export function usePdfPreview(bank: DataBank, enabled: boolean = true) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setCompiling(true);
      setError(null);
      try {
        const tex = renderDataBankToLatex(bank);
        const res = await fetch("/api/compile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tex, mainFile: "main.tex" }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `compile ${res.status}`);
        }
        const data = await res.json();
        const bytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setCompiling(false);
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bank, enabled]);

  return { pdfUrl, compiling, error };
}
