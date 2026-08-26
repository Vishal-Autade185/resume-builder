/**
 * useSelection - per-collection inclusion state for the data bank form.
 *
 * Selection is stored as a partial `Selection` object: each key, when
 * present, is the explicit list of included ids; when absent, all items in
 * that collection are included (the all-on default).
 *
 * This hook only owns the selection state. The data bank itself lives in
 * DataBankForm. Keeping these separate lets us render the full bank in the
 * editor (so users can still see/edit excluded items) while the live
 * preview and saved-version PDF reflect only what\'s in the selection.
 */
"use client";
import { useCallback, useState } from "react";
import type { DataBank, Selection } from "@resume-builder/shared";

export function useSelection() {
  const [selection, setSelection] = useState<Selection>({});

  // Reset to all-on (no keys). Used on initial load and on "back to live edit".
  const resetToAllOn = useCallback(() => setSelection({}), []);

  // Replace the selection wholesale. Used when loading a version.
  const replaceSelection = useCallback((next: Selection) => setSelection(next), []);

  // Build an all-on selection from a bank\'s current ids. Useful when the
  // user wants to explicitly opt-out of the implicit-all-on default.
  const materializeAllOn = useCallback((bank: DataBank): Selection => {
    const next: Selection = {};
    for (const k of [
      "education",
      "experience",
      "projects",
      "skills",
      "certifications",
      "publications",
      "achievements",
    ] as const) {
      next[k] = (bank[k] as Array<{ id: string }>).map((it) => it.id);
    }
    return next;
  }, []);

  // Resolve which items in a collection are included given the current
  // selection. Mirrors applySelection\'s semantics (undefined = all-on).
  function isIncluded<K extends keyof Selection>(
    key: K,
    id: string,
    items: ReadonlyArray<{ id: string }>,
  ): boolean {
    const sel = selection[key];
    if (sel === undefined) return true;
    return sel.includes(id);
  }

  // Toggle one id within a collection. Adds/removes the key from the
  // selection object as needed (keeps the shape compact: keys that have
  // all items included collapse to undefined for the all-on default).
  function toggle<K extends keyof Selection>(
    key: K,
    id: string,
    items: ReadonlyArray<{ id: string }>,
  ) {
    setSelection((prev) => {
      const current = prev[key] as readonly string[] | undefined;
      // First toggle from all-on: materialize an explicit array of all ids.
      let base: string[] = current === undefined ? items.map((it) => it.id) : [...current];
      const idx = base.indexOf(id);
      if (idx >= 0) base.splice(idx, 1);
      else base.push(id);

      // Collapse back to all-on default if every item is included.
      const allIds = new Set(items.map((it) => it.id));
      const isAllOn = base.length === items.length && base.every((x) => allIds.has(x));
      if (isAllOn) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      // Empty array = all-off for this collection.
      return { ...prev, [key]: base };
    });
  }

  return {
    selection,
    setSelection,
    resetToAllOn,
    replaceSelection,
    materializeAllOn,
    isIncluded,
    toggle,
  };
}