/**
 * Personal info — top of the resume, contact block.
 * Required per product.md §2.1.
 */
import { z } from "zod";

export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  phone: z.string().min(1, "Phone is required"),
  location: z.string().nullable().default(null),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url("Must be a valid URL"),
      }),
    )
    .default([]),
  /**
   * Free-form 2-4 sentence summary rendered as the resume's
   * \section{SUMMARY} block. Phase 4 accepts research-derived text
   * into this field via /api/company-research/apply.
   */
  summary: z.string().default(""),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;