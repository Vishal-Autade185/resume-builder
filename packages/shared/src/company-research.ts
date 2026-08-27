/**
 * Company research - shared types for phase 4 §2.10.
 *
 * The api route POST /api/company-research takes a company name (+ jd
 * for alignment scoring), calls tavily for sources, and runs gemini
 * over the source content to produce a structured research summary.
 *
 * The structured shape supports a diff/accept-reject ui: each
 * section (summary, values, recentNews, jdAlignment) can be shown
 * separately so the user decides what to add to their resume.
 */
import { z } from "zod";

export const ResearchSourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  /** Short excerpt from the source, max ~500 chars. */
  excerpt: z.string().max(800),
});
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const CompanyResearchSchema = z.object({
  /** Company name as resolved (may differ from input if we corrected
   * casing or expanded an acronym). */
  companyName: z.string(),
  /** 2-3 paragraph prose summary suitable for a resume's
   *  \section{SUMMARY} block. */
  summary: z.string(),
  /** Bullet list of company values / culture signals. */
  values: z.array(z.string()),
  /** 3-5 recent headlines or initiatives from the last 6 months. */
  recentNews: z.array(z.string()),
  /** If a jd was supplied, bullet list of which jd requirements
   *  align well with the company profile (helps the user decide
   *  what to emphasize in their tailored resume). */
  jdAlignment: z.array(z.string()).default([]),
  /** Sources the research is built on. */
  sources: z.array(ResearchSourceSchema),
  /** When the research was generated (server-set). */
  generatedAt: z.string(),
});
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

/** Subset of CompanyResearch the user can apply to their resume. */
export const ApplicableResearchSchema = z.object({
  /** True if the user wants to use the prose summary as their
   *  \section{SUMMARY} content. */
  useSummary: z.boolean().default(false),
  /** Specific values to weave into bullet points (e.g. "data-driven"
   *  -> highlight a metric-driven bullet). */
  useValues: z.array(z.string()).default([]),
  /** Specific jd alignment points to incorporate. */
  useJdAlignment: z.array(z.string()).default([]),
});
export type ApplicableResearch = z.infer<typeof ApplicableResearchSchema>;