/**
 * Proposed Change - the diff/accept-reject unit for AI tailoring.
 *
 * Per product.md section 2.13, every AI-suggested change is shown to the
 * user as a discrete, individually-accept/reject item. This is the
 * building block: an "include this", "exclude that", or "rewrite this
 * bullet" with the old text + new text + a source citation.
 *
 * sourceCitation links the change back to a specific data-bank field it
 * came from (per product.md section 4's structured-field invariant). If
 * the citation is "loose" or missing, the fact-grounding check flags it.
 */
import { z } from "zod";

export const ProposedChangeKindSchema = z.enum([
  "select_experience",
  "deselect_experience",
  "select_project",
  "deselect_project",
  "select_education",
  "deselect_education",
  "select_skill",
  "deselect_skill",
  "select_certification",
  "deselect_certification",
  "rewrite_experience_bullet",
  "rewrite_project_description",
  "rewrite_project_impact",
]);
export type ProposedChangeKind = z.infer<typeof ProposedChangeKindSchema>;

/**
 * A citation to a specific data-bank field. The fact-grounding check
 * uses this to confirm "AI rephrased an existing bullet, didn't invent
 * a new claim."
 */
export const SourceCitationSchema = z.object({
  /** Path within the data bank, e.g. "experience.0.bullets.1" or
   * "projects.2.description". */
  field: z.string(),
  /** Verbatim text from the source field. */
  original: z.string(),
});
export type SourceCitation = z.infer<typeof SourceCitationSchema>;

export const ProposedChangeSchema = z.object({
  /** Stable id (uuid) for react keys + accept/reject state. */
  id: z.string().uuid(),
  kind: ProposedChangeKindSchema,
  /** Human-readable summary ("rewrite Experience #2 bullet 1", etc). */
  summary: z.string().min(1),
  /** What the field looks like now. null = the field is currently absent. */
  before: z.string().nullable(),
  /** What the AI wants it to become. null = the AI is proposing to delete it. */
  after: z.string().nullable(),
  /** The id of the entity in the data bank this change applies to.
   * Null for "global" changes (none defined yet, but reserved). */
  entityId: z.string().uuid().nullable(),
  /** Optional citation: which data-bank field the new text was sourced from. */
  source: SourceCitationSchema.nullable().default(null),
  /** Free-form AI reasoning. Shown to the user before they accept. */
  rationale: z.string().min(1),
});

export type ProposedChange = z.infer<typeof ProposedChangeSchema>;