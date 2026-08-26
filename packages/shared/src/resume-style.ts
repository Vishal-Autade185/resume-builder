/**
 * Resume style settings - the toggles that steer AI rewriting per
 * product.md section 2.6:
 *   - focusOnCore: trim to most relevant items only
 *   - quantify:   push bullets toward measurable outcomes
 *   - noOrphans:  avoid single-line orphan/widow bullets across page breaks
 *   - ats:        action-verb-first, consistent tense, no graphics-only content
 *
 * Phase 3 ships the schema and the AI prompt includes them. Phase 3.5+
 * will add page-count enforcement. For now: settings are stored per-user
 * in resume_style_settings (separate from ai_settings), and snapshot
 * into resume_versions.style_settings whenever a version is saved.
 */
import { z } from "zod";

export const ResumeStyleSchema = z.object({
  focusOnCore: z.boolean().default(true),
  quantify: z.boolean().default(true),
  noOrphans: z.boolean().default(true),
  ats: z.boolean().default(true),
});

export type ResumeStyle = z.infer<typeof ResumeStyleSchema>;

export const defaultResumeStyle = (): ResumeStyle => ({
  focusOnCore: true,
  quantify: true,
  noOrphans: true,
  ats: true,
});