/**
 * Job Description — normalized representation. Three input paths converge
 * here per product.md section 2.3:
 *   - raw text pasted directly (kind: "text")
 *   - .pdf parsed via pdf-parse (kind: "pdf"); falls back to a note for scans
 *   - .docx parsed via mammoth (kind: "docx")
 *
 * The downstream ai pipeline only sees rawText. Metadata is for the ui to
 * show "this came from a 3-page PDF" or warn about OCR-needed scans.
 */
import { z } from "zod";

export const JDSourceSchema = z.enum(["text", "pdf", "docx"]);
export type JDSource = z.infer<typeof JDSourceSchema>;

export const JobDescriptionSchema = z.object({
  id: z.string().uuid(),
  rawText: z.string().min(1, "JD text is required"),
  sourceName: z.string().nullable().default(null),
  /** Which parser produced this. "text" means user pasted it directly. */
  source: JDSourceSchema,
  /** Free-form parser diagnostics. UI surfaces these so the user knows
   * when a PDF was actually a scan and the text might be incomplete. */
  warnings: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;

/** Empty default for form initialization. */
export const emptyJobDescription = (): Omit<JobDescription, "id" | "createdAt"> => ({
  rawText: "",
  sourceName: null,
  source: "text",
  warnings: [],
});