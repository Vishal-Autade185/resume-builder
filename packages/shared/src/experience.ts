/**
 * Experience entry — a job/internship. Bullets are the visible resume lines.
 * Each bullet will be a structured field that AI may rephrase in phase 2+;
 * keeping bullets as a string[] (not raw prose) is the structured-field
 * invariant from product.md §4.
 */
import { z } from "zod";

export const ExperienceSchema = z.object({
  id: z.string().uuid(),
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  location: z.string().nullable().default(null),
  startDate: z.string().min(1),
  endDate: z.string().min(1), // "Present" allowed
  bullets: z.array(z.string().min(1)).default([]),
});

export type Experience = z.infer<typeof ExperienceSchema>;