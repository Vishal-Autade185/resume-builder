/**
 * Resume Version — a saved checkpoint of (data bank + selection + template +
 * rendered PDF). Per product.md §2.8, a version knows what's in it and how
 * it differs from sibling versions.
 *
 * Selection is per-entity-id (not per-position) so reordering the data bank
 * doesn't silently change what's in an old version.
 */
import { z } from "zod";

/**
 * Selection: which items from each collection are included in this version.
 * A missing key means "all-on" (every item in that collection is included);
 * an explicit empty array means "all-off" (no items from that collection).
 * This lets new version creation be concise (full DataBank -> selection of all ids).
 */
export const SelectionSchema = z.object({
  education: z.array(z.string().uuid()).optional(),
  experience: z.array(z.string().uuid()).optional(),
  projects: z.array(z.string().uuid()).optional(),
  skills: z.array(z.string().uuid()).optional(),
  certifications: z.array(z.string().uuid()).optional(),
  publications: z.array(z.string().uuid()).optional(),
  achievements: z.array(z.string().uuid()).optional(),
});

export type Selection = z.infer<typeof SelectionSchema>;

export const ResumeVersionSchema = z.object({
  id: z.string().uuid(),
  /** Human-readable label, e.g. "Google - SWE Intern, 2026-08". */
  label: z.string().min(1, "Label is required"),
  /** Snapshot of the full DataBank at the moment this version was saved. */
  dataBankSnapshot: z.object({
    personal: z.object({
      fullName: z.string(),
      email: z.string(),
      phone: z.string(),
      location: z.string().nullable(),
      links: z.array(z.object({ label: z.string(), url: z.string().url() })),
    }),
    education: z.array(z.any()),
    experience: z.array(z.any()),
    projects: z.array(z.any()),
    skills: z.array(z.any()),
    certifications: z.array(z.any()),
    publications: z.array(z.any()),
    achievements: z.array(z.any()),
  }),
  selection: SelectionSchema,
  templateId: z.string().uuid().nullable(),
  /**
   * Phase 3+ will store style toggles (Focus/Quantify/ATS/NoOrphans).
   * For phase 1 we just persist an empty object.
   */
  styleSettings: z.record(z.unknown()).default({}),
  /** Path in the `pdfs` bucket, or null until first compile succeeds. */
  pdfStoragePath: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
});

export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;

/** Build the default selection (all-on) from a DataBank. */
export function defaultSelectionFromIds(ids: {
  education?: readonly string[];
  experience?: readonly string[];
  projects?: readonly string[];
  skills?: readonly string[];
  certifications?: readonly string[];
  publications?: readonly string[];
  achievements?: readonly string[];
}): Selection {
  return {
    education: ids.education ? [...ids.education] : undefined,
    experience: ids.experience ? [...ids.experience] : undefined,
    projects: ids.projects ? [...ids.projects] : undefined,
    skills: ids.skills ? [...ids.skills] : undefined,
    certifications: ids.certifications ? [...ids.certifications] : undefined,
    publications: ids.publications ? [...ids.publications] : undefined,
    achievements: ids.achievements ? [...ids.achievements] : undefined,
  };
}

/**
 * Filter a collection through a Selection. Items whose id is in the
 * selectedIds array are kept; others dropped. If selectedIds is undefined,
 * ALL items are kept (all-on default).
 */
export function applySelection<
  T extends { id: string },
>(
  items: readonly T[],
  selectedIds: readonly string[] | undefined,
): T[] {
  if (selectedIds === undefined) return [...items];
  const set = new Set(selectedIds);
  return items.filter((it) => set.has(it.id));
}
