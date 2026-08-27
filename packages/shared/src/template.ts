/**
 * Template - shared types for the template-upload feature (phase 4).
 *
 * Templates are user-uploaded LaTeX files (typically main.tex inside
 * a .zip). We auto-detect which data-bank fields each template uses,
 * show the user a form for just those fields, then save + render the
 * template later when a version is created.
 */
import { z } from "zod";

export const SectionKindSchema = z.enum([
  "personal",
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
]);
export type SectionKind = z.infer<typeof SectionKindSchema>;

export const TemplateSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  detectedFields: z.object({
    sections: z.array(
      z.object({
        kind: SectionKindSchema,
        count: z.number(),
        heading: z.string().nullable(),
      }),
    ),
    fillable: z.boolean(),
    recognizedMacros: z.array(z.string()),
  }),
  createdAt: z.string(),
});
export type TemplateSummary = z.infer<typeof TemplateSummarySchema>;

export const TemplateDetailSchema = TemplateSummarySchema.extend({
  /** Raw .tex source the user uploaded. */
  tex: z.string(),
});
export type TemplateDetail = z.infer<typeof TemplateDetailSchema>;
